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
    memory = new WebAssembly.Memory({ initial: 1 })
    wasm = new WebAssembly.Instance(mod, {
      config: {
        start: 0
      },
      resource: {
        memory: memory
      }
    });
  });

  it("malloc", () => {

  });
});