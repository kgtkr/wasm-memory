(module
    (import "resource" "memory" (memory 1))
    (import "memory" "malloc" (func $memory_malloc (param i32) (result i32)))
    (import "memory" "free" (func $memory_free (param i32)))
    (import "memory" "get_size" (func $memory_get_size (param i32) (result i32)))
    (import "memory" "get_next" (func $memory_get_next (param i32) (result i32)))
    (import "memory" "get_flag" (func $memory_get_flag (param i32) (result i32)))
    (import "memory" "HEAD_SIZE" (global $memory_HEAD_SIZE i32))
    (import "memory" "USE_FLAG_INVALID" (global $memory_USE_FLAG_INVALID i32))
    (import "memory" "USE_FLAG_NON_USE" (global $memory_USE_FLAG_NON_USE i32))
    (import "memory" "USE_FLAG_USE" (global $memory_USE_FLAG_USE i32))

    (global $HEAD_SIZE i32 (i32.const 5))
    (global $FLAG_MARKED i32 (i32.const 0x1))
    (global $FLAG_IS_POINTERS i32 (i32.const 0x2))

    (func $get_flag_p (param $p i32) (result i32)
        (i32.sub (get_local $p) (i32.const 5))
    )

    (func $get_flag (param $p i32) (result i32)
        (i32.load8_s (call $get_flag_p (get_local $p)))
    )

    (func $set_flag (param $p i32) (param $v i32)
        (i32.store8 (call $get_flag_p (get_local $p)) (get_local $v))
    )

    (func $get_count_p (param $p i32) (result i32)
        (i32.sub (get_local $p) (i32.const 4))
    )

    (func $get_count (param $p i32) (result i32)
        (i32.load (call $get_count_p (get_local $p)))
    )

    (func $set_count (param $p i32) (param $v i32)
        (i32.store (call $get_count_p (get_local $p)) (get_local $v))
    )

    (func $to_memory_pointer (param $p i32) (result i32)
        (i32.sub (get_local $p) (get_global $HEAD_SIZE))
    )

    (func $from_memory_pointer (param $p i32) (result i32)
        (i32.add (get_local $p) (get_global $HEAD_SIZE))
    )

    (func $on_bit_flag (param $p i32) (param $flag i32)
        (call $set_flag (get_local $p) (i32.or (call $get_flag (get_local $p)) (get_local $flag)))
    )

    (func $off_bit_flag (param $p i32) (param $flag i32)
        (call $set_flag (get_local $p) (i32.and (call $get_flag (get_local $p)) (i32.xor (get_local $flag) (i32.const -1))))
    )

    (func $get_bit_flag (param $p i32) (param $flag i32) (result i32)
        (i32.and (call $get_flag (get_local $p)) (get_local $flag))
    )

    (func $malloc (export "malloc") (param $size i32) (result i32)
        (call $from_memory_pointer (call $memory_malloc (i32.add (get_local $size) (get_global $HEAD_SIZE))))
    )

    (func $free (param $p i32)
        (call $memory_free (call $to_memory_pointer (get_local $p)))
    )

    (func $inc_count (export "inc_count") (param $p i32)
        (call $set_count (get_local $p) (i32.add (call $get_count (get_local $p)) (i32.const 1)))
    )

    (func $dec_count (export "dec_count") (param $p i32)
        (call $set_count (get_local $p) (i32.add (call $get_count (get_local $p)) (i32.const -1)))
    )

    (func $mark
        (local $iter_p i32)
        (set_local $iter_p (get_global $memory_HEAD_SIZE))

        loop $loop
            (if (i32.ne (call $memory_get_flag (get_local $iter_p)) (get_global $memory_USE_FLAG_INVALID))
                (then
                    (if (i32.ne (call $get_count (call $from_memory_pointer (get_local $iter_p))) (i32.const 0))
                        (then
                            (call $mark_rec (call $from_memory_pointer (get_local $iter_p)))
                        )
                    )
                    (set_local $iter_p (call $memory_get_next (get_local $iter_p)))
                    br $loop
                )
            )
        end
    )

    (func $mark_rec (param $ref i32)
    
    )
)