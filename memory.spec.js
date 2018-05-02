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

    expect(wasm.exports.malloc(20)).toBe(2);
    memSim.setInt8(2, 2, true);
    memSim.setInt32(3, 20, true);
    memSim.setInt32(7, -1, true);
    expect(memory.buffer).abEq(memSimBuf);
  });
});