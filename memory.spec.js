const child_process = require('child_process');
const fs = require("fs");

describe("memory", () => {
  it("test", () => {
    child_process.execSync("wat2wasm memory.wat");
    const buf = fs.readFileSync("memory.wasm");
    const memory = new WebAssembly.Memory({ initial: 1 })
    const mod = new WebAssembly.Module(buf);
    const inst = new WebAssembly.Instance(mod, {
      config: {
        start: 0
      },
      resource: {
        memory: memory
      }
    });
  });
});