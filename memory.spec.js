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

    //<2>[10,20]
    expect(wasm.exports.malloc(20, 0)).toBe(12);
    memSim.setInt8(2, 2, true);
    memSim.setInt32(3, 20, true);
    memSim.setInt32(7, -1, true);
    memSim.setInt32(11, 0, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>[10,20][10,5]
    expect(wasm.exports.malloc(5, 1)).toBe(42);
    memSim.setInt8(32, 2, true);
    memSim.setInt32(33, 5, true);
    memSim.setInt32(37, 12, true);
    memSim.setInt32(41, 1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(10,20)[10,5]
    wasm.exports.free(12);
    memSim.setInt8(2, 1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>[10,20][10,5]
    expect(wasm.exports.malloc(20, 0)).toBe(12);
    memSim.setInt8(2, 2, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(10,20)[10,5]
    wasm.exports.free(12);
    memSim.setInt8(2, 1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>[10,10](10,0)[10,5]
    expect(wasm.exports.malloc(10, 0)).toBe(12);
    memSim.setInt8(2, 2, true);
    memSim.setInt32(3, 10, true);
    memSim.setInt32(7, -1, true);

    memSim.setInt8(22, 1, true);
    memSim.setInt32(23, 0, true);
    memSim.setInt32(27, 12, true);

    memSim.setInt32(37, 32, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(10,20)[10,5]
    wasm.exports.free(12);
    memSim.setInt8(2, 1, true);
    memSim.setInt32(3, 20, true);
    memSim.setInt32(7, -1, true);

    memSim.setInt32(37, 12, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(10,20)[10,5][10,11]
    expect(wasm.exports.malloc(11, 0)).toBe(57);
    memSim.setInt8(47, 2, true);
    memSim.setInt32(48, 11, true);
    memSim.setInt32(52, 42, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(10,20)[10,5]
    wasm.exports.free(57);
    memSim.setInt8(47, 0, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(10,20)[10,5][10,11]
    expect(wasm.exports.malloc(11, 0)).toBe(57);
    memSim.setInt8(47, 2, true);
    memSim.setInt32(48, 11, true);
    memSim.setInt32(52, 42, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>(10,35)[10,11]
    wasm.exports.free(42);
    memSim.setInt32(3, 35, true);
    memSim.setInt32(7, -1, true);

    memSim.setInt32(52, 12, true);
    expect(memory.buffer).abEq(memSimBuf);

    //<2>
    wasm.exports.free(57);
    memSim.setInt8(2, 0, true);
    memSim.setInt32(3, 56, true);
    expect(memory.buffer).abEq(memSimBuf);
  });
});