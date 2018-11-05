const fs = require("fs");

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
  it("正常に動作するか", () => {

    const memory = new WebAssembly.Memory({ initial: 1 });
    const wasm = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync("memory.wasm")), {
      resource: {
        memory: memory
      }
    });
    const dv = new DataView(memory.buffer);

    expect(dataViewToBlocks(dv)).toEqual([]);

    //[9,20]
    expect(wasm.exports.malloc(20)).toBe(9);
    expect(dataViewToBlocks(dv)).toEqual([[20, true]]);

    //[9,20][9,5]
    expect(wasm.exports.malloc(5)).toBe(38);
    expect(dataViewToBlocks(dv)).toEqual([[20, true], [5, true]]);

    //(9,20)[9,5]
    expect(wasm.exports.free(9)).toBe(9);
    expect(dataViewToBlocks(dv)).toEqual([[20, false], [5, true]]);

    //同じサイズ
    //[9,20][9,5]
    expect(wasm.exports.malloc(20)).toBe(9);
    expect(dataViewToBlocks(dv)).toEqual([[20, true], [5, true]]);

    //(9,20)[9,5]
    expect(wasm.exports.free(9)).toBe(9);
    expect(dataViewToBlocks(dv)).toEqual([[20, false], [5, true]]);

    //ギリギリ入る小さいサイズ
    //[9,11](9,0)[9,5]
    expect(wasm.exports.malloc(11)).toBe(9);
    expect(dataViewToBlocks(dv)).toEqual([[11, true], [0, false], [5, true]]);

    //(9,20)[9,5]
    expect(wasm.exports.free(9)).toBe(9);
    expect(dataViewToBlocks(dv)).toEqual([[20, false], [5, true]]);

    //ギリギリ入らないサイズ
    //(9,20)[9,5][9,12]
    expect(wasm.exports.malloc(12)).toBe(52);
    expect(dataViewToBlocks(dv)).toEqual([[20, false], [5, true], [12, true]]);

    //(9,20)[9,5]
    expect(wasm.exports.free(52)).toBe(0);
    expect(dataViewToBlocks(dv)).toEqual([[20, false], [5, true]]);

    //(9,20)[9,5][9,12]
    expect(wasm.exports.malloc(12)).toBe(52);
    expect(dataViewToBlocks(dv)).toEqual([[20, false], [5, true], [12, true]]);

    //(9,34)[9,12]
    expect(wasm.exports.free(38)).toBe(9);
    expect(dataViewToBlocks(dv)).toEqual([[34, false], [12, true]]);

    //
    expect(wasm.exports.free(52)).toBe(0);
    expect(dataViewToBlocks(dv)).toEqual([]);
  });
});