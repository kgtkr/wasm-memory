const child_process = require('child_process');
const fs = require("fs");
const abEq = require("arraybuffer-equal");

expect.extend({
  abEq(x, y) {
    const pass = abEq(x, y);
    if (pass) {
      return {
        message: () => `expected pass`,
        pass: true,
      };
    } else {
      let msg = "";
      const a = new Int8Array(x);
      const b = new Int8Array(y);
      if (a.length !== b.length) {
        msg = `length expect:${b.length} value:${a.length}`;
      } else {
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) {
            msg += `\nindex:${i} expect:${b[i]} value:${a[i]}`;
          }
        }
      }
      return {
        message: () => `expected ${msg}`,
        pass: false,
      };
    }
  },
});

describe("memory", () => {
  var mod;
  var memory;
  var wasm;
  beforeAll(() => {
    child_process.execSync("wat2wasm memory.wat");
    const buf = fs.readFileSync("memory.wasm");
    mod = new WebAssembly.Module(buf);
  });

  beforeEach(() => {
    memory = new WebAssembly.Memory({ initial: 1 });
    wasm = new WebAssembly.Instance(mod, {
      config: {
        start: 2
      },
      resource: {
        memory: memory
      }
    });
  });

  it("正常に動作するか", () => {
    const memSimBuf = memory.buffer.slice(0);
    const memSim = new DataView(memSimBuf);

    //<2>[13,20]
    expect(wasm.exports.malloc(20)).toBe(15);
    memSim.setInt8(2, 2, true);
    memSim.setInt32(3, 20, true);
    memSim.setInt32(7, -1, true);
    memSim.setInt32(11, 1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>[13,20][13,5]
    expect(wasm.exports.malloc(5)).toBe(48);
    memSim.setInt8(35, 2, true);
    memSim.setInt32(36, 5, true);
    memSim.setInt32(40, 15, true);
    memSim.setInt32(44, 1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(13,20)[13,5]
    wasm.exports.free(15);
    memSim.setInt8(2, 1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>[13,20][13,5]
    expect(wasm.exports.malloc(20)).toBe(15);
    memSim.setInt8(2, 2, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(13,20)[13,5]
    wasm.exports.free(15);
    memSim.setInt8(2, 1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>[13,7](13,0)[13,5]
    expect(wasm.exports.malloc(7)).toBe(15);
    memSim.setInt8(2, 2, true);
    memSim.setInt32(3, 7, true);
    memSim.setInt32(7, -1, true);

    memSim.setInt8(22, 1, true);
    memSim.setInt32(23, 0, true);
    memSim.setInt32(27, 15, true);

    memSim.setInt32(40, 35, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(13,20)[13,5]
    wasm.exports.free(15);
    memSim.setInt8(2, 1, true);
    memSim.setInt32(3, 20, true);
    memSim.setInt32(7, -1, true);

    memSim.setInt32(40, 15, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(13,20)[13,5][13,11]
    expect(wasm.exports.malloc(11)).toBe(66);
    memSim.setInt8(53, 2, true);
    memSim.setInt32(54, 11, true);
    memSim.setInt32(58, 48, true);
    memSim.setInt32(62, 1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(13,20)[13,5]
    wasm.exports.free(66);
    memSim.setInt8(53, 0, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(13,20)[13,5][13,11]
    expect(wasm.exports.malloc(11)).toBe(66);
    memSim.setInt8(53, 2, true);
    memSim.setInt32(54, 11, true);
    memSim.setInt32(58, 48, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(13,38)[13,11]
    wasm.exports.free(48);
    memSim.setInt32(3, 38, true);
    memSim.setInt32(7, -1, true);

    memSim.setInt32(58, 15, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>
    wasm.exports.free(66);
    memSim.setInt8(2, 0, true);
    memSim.setInt32(3, 62, true);
    expect(memory.buffer).abEq(memSimBuf);
  });
});