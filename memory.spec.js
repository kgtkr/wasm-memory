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

function dataViewToBlocks(data) {
  const res = [];
  let expectPrev = 0;
  let point = 9;
  while (data.getInt8(point - 9, true) !== 0) {
    const flag = data.getInt8(point - 9, true);
    const size = data.getInt32(point - 8, true);
    const prev = data.getInt32(point - 4, true);
    if ((flag === 1 || flag === 2) && size >= 0 && prev === expectPrev) {
      res.push([size, flag === 2]);
      expectPrev = point;
      point += size + 9;
    } else {
      throw new Error();
    }
  }

  return res;
}

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
      resource: {
        memory: memory
      }
    });
  });

  it("正常に動作するか", () => {
    const dv = new DataView(memory.buffer);

    expect(dataViewToBlocks(dv)).toEqual([]);

    //[9,20]
    expect(wasm.exports.malloc(20)).toBe(9);
    expect(dataViewToBlocks(dv)).toEqual([[20, true]]);

    //[9,20][9,5]
    expect(wasm.exports.malloc(5)).toBe(38);
    expect(dataViewToBlocks(dv)).toEqual([[20, true], [5, true]]);

    //(9,20)[9,5]
    wasm.exports.free(15);
    expect(dataViewToBlocks(dv)).toEqual([[20, false], [5, true]]);

    //同じサイズ
    //[9,20][9,5]
    expect(wasm.exports.malloc(20)).toBe(15);
    memSim.setInt8(2, 2, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(9,20)[9,5]
    wasm.exports.free(15);
    memSim.setInt8(2, 1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //ギリギリ入る小さいサイズ
    //[9,7](9,0)[9,5]
    expect(wasm.exports.malloc(7)).toBe(15);
    memSim.setInt8(2, 2, true);
    memSim.setInt32(3, 7, true);
    memSim.setInt32(7, -1, true);

    memSim.setInt8(22, 1, true);
    memSim.setInt32(23, 0, true);
    memSim.setInt32(27, 15, true);

    memSim.setInt32(40, 35, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(9,20)[9,5]
    wasm.exports.free(15);
    memSim.setInt8(2, 1, true);
    memSim.setInt32(3, 20, true);
    memSim.setInt32(7, -1, true);

    memSim.setInt32(40, 15, true);
    expect(memory.buffer).abEq(memSimBuf);

    //ギリギリ入らないサイズ
    //(9,20)[9,5][9,11]
    expect(wasm.exports.malloc(11)).toBe(66);
    memSim.setInt8(53, 2, true);
    memSim.setInt32(54, 11, true);
    memSim.setInt32(58, 48, true);
    memSim.setInt32(62, 1, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(9,20)[9,5]
    wasm.exports.free(66);
    memSim.setInt8(53, 0, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(9,20)[9,5][9,11]
    expect(wasm.exports.malloc(11)).toBe(66);
    memSim.setInt8(53, 2, true);
    memSim.setInt32(54, 11, true);
    memSim.setInt32(58, 48, true);
    expect(memory.buffer).abEq(memSimBuf);

    //(9,38)[9,11]
    wasm.exports.free(48);
    memSim.setInt32(3, 38, true);
    memSim.setInt32(7, -1, true);

    memSim.setInt32(58, 15, true);
    expect(memory.buffer).abEq(memSimBuf);

    //
    wasm.exports.free(66);
    memSim.setInt8(2, 0, true);
    memSim.setInt32(3, 62, true);
    expect(memory.buffer).abEq(memSimBuf);
  });
});