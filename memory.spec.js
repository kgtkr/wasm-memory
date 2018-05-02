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

    //20
    expect(wasm.exports.malloc(20)).toBe(2);
    memSim.setInt8(2, 2, true);
    memSim.setInt32(3, 20, true);
    memSim.setInt32(7, -1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //20/5
    expect(wasm.exports.malloc(5)).toBe(31);
    memSim.setInt8(31, 2, true);
    memSim.setInt32(32, 5, true);
    memSim.setInt32(36, 2, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(20)/5
    wasm.exports.free(2);
    memSim.setInt8(2, 1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //20/5
    expect(wasm.exports.malloc(20)).toBe(2);
    memSim.setInt8(2, 2, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(20)/5
    wasm.exports.free(2);
    memSim.setInt8(2, 1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //11/(0)/5
    expect(wasm.exports.malloc(11)).toBe(2);
    memSim.setInt8(2, 2, true);
    memSim.setInt32(3, 11, true);
    memSim.setInt32(7, -1, true);

    memSim.setInt8(22, 1, true);
    memSim.setInt32(23, 0, true);
    memSim.setInt32(27, 2, true);

    memSim.setInt32(36, 22, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(20)/5
    wasm.exports.free(2);
    memSim.setInt8(2, 1, true);
    memSim.setInt32(3, 20, true);
    memSim.setInt32(7, -1, true);

    memSim.setInt32(36, 2, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(20)/5/12
    expect(wasm.exports.malloc(12)).toBe(45);
    memSim.setInt8(45, 2, true);
    memSim.setInt32(46, 12, true);
    memSim.setInt32(50, 31, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(20)/5
    wasm.exports.free(45);
    memSim.setInt8(45, 0, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(20)/5/12
    expect(wasm.exports.malloc(12)).toBe(45);
    memSim.setInt8(45, 2, true);
    memSim.setInt32(46, 12, true);
    memSim.setInt32(50, 31, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(34)/12
    wasm.exports.free(31);
    memSim.setInt32(3, 34, true);
    memSim.setInt32(7, -1, true);

    memSim.setInt32(50, 2, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(なし)
    wasm.exports.free(45);
    memSim.setInt8(2, 0, true);
    memSim.setInt32(3, 55, true);
    expect(memory.buffer).abEq(memSimBuf);
  });
});