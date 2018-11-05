const fs = require("fs");

describe("memory", () => {
  it("正常に動作するか", () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const memoryWasm = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync("memory.wasm")), {
      resource: {
        memory: memory
      }
    });
    const gcWasm = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync("gc.wasm")), {
      resource: {
        memory: memory
      },
      memory: memoryWasm.exports,
    });
    const dv = new DataView(memory.buffer);

    const a = gcWasm.exports.malloc(4, 1);
    const b = gcWasm.exports.malloc(4, 1);
    dv.setInt32(a, b, true);
    dv.setInt32(b, a, true);
    gcWasm.exports.run_gc();

    // どこからも参照されない(死ぬ)
    const ref1 = gcWasm.exports.malloc(0, 1);
    fs.writeFileSync("dump.bin", new Buffer(memory.buffer));

    // ref2は参照じゃないけどref3を参照もどき(ref3は死ぬ)
    const ref2 = gcWasm.exports.malloc(4, 0);
    const ref3 = gcWasm.exports.malloc(0, 0);
    gcWasm.exports.inc_count(ref2);
    dv.setInt32(ref2, ref3, true);

    // ref4とref5が孤立循環参照(死ぬ)
    const ref4 = gcWasm.exports.malloc(4, 1);
    const ref5 = gcWasm.exports.malloc(4, 1);
    dv.setInt32(ref4, ref5, true);
    dv.setInt32(ref5, ref4, true);

    // ref6がルートでref7を参照、ref7とref8は循環参照(生きる)
    const ref6 = gcWasm.exports.malloc(4, 1);
    const ref7 = gcWasm.exports.malloc(4, 1);
    const ref8 = gcWasm.exports.malloc(4, 1);
    gcWasm.exports.inc_count(ref6);
    dv.setInt32(ref6, ref7, true);
    dv.setInt32(ref7, ref8, true);
    dv.setInt32(ref8, ref7, true);

    // ルートかつ自分自信を循環参照(生きる)
    const ref9 = gcWasm.exports.malloc(4, 1);
    gcWasm.exports.inc_count(ref9);
    dv.setInt32(ref9, ref9, true);

    // ref10がルート、ref10→ref11、ref11→ref12(生きる)
    const ref10 = gcWasm.exports.malloc(4, 1);
    const ref11 = gcWasm.exports.malloc(4, 1);
    const ref12 = gcWasm.exports.malloc(0, 1);
    gcWasm.exports.inc_count(ref10);
    dv.setInt32(ref10, ref11, true);
    dv.setInt32(ref11, ref12, true);

    // ref13がルート、ref14とref15を参照(生きる)
    const ref13 = gcWasm.exports.malloc(8, 1);
    const ref14 = gcWasm.exports.malloc(0, 1);
    const ref15 = gcWasm.exports.malloc(0, 1);
    gcWasm.exports.inc_count(ref13);
    dv.setInt32(ref13, ref14, true);
    dv.setInt32(ref13 + 4, ref15, true);

    // ref16とref17がルート、ref18を参照(生きる)
    const ref16 = gcWasm.exports.malloc(4, 1);
    const ref17 = gcWasm.exports.malloc(4, 1);
    const ref18 = gcWasm.exports.malloc(0, 1);
    gcWasm.exports.inc_count(ref16);
    gcWasm.exports.inc_count(ref17);
    dv.setInt32(ref16, ref18, true);
    dv.setInt32(ref17, ref18, true);

    // ref19がルート、nullを持つ(生きる)
    const ref19 = gcWasm.exports.malloc(4, 1);
    gcWasm.exports.inc_count(ref19);
    dv.setInt32(ref19, 0, true);

    gcWasm.exports.run_gc();

    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref1)))
      .toBe(memoryWasm.exports.USE_FLAG_NON_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref2)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref3)))
      .toBe(memoryWasm.exports.USE_FLAG_NON_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref4)))
      .toBe(memoryWasm.exports.USE_FLAG_NON_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref5)))
      .toBe(memoryWasm.exports.USE_FLAG_NON_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref6)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref7)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref8)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref9)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref10)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref11)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref12)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref13)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref14)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref15)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref16)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref17)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref18)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
    expect(memoryWasm.exports.get_flag(gcWasm.exports.to_p(ref19)))
      .toBe(memoryWasm.exports.USE_FLAG_USE);
  });
});