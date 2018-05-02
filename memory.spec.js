const child_process = require('child_process');
const fs = require("fs");

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
    wasm.exports.malloc(20);
    expect(memory.buffer).toEqual(memSimBuf);
  });
});