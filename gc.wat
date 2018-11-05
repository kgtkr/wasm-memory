(module
  (import "resource" "memory" (memory 1))
  (import "memory" "malloc" (func $memory_malloc (param i32) (result i32)))
  (import "memory" "free" (func $memory_free (param i32) (result i32)))
  (import "memory" "get_size" (func $memory_get_size (param i32) (result i32)))
  (import "memory" "get_next" (func $memory_get_next (param i32) (result i32)))
  (import "memory" "get_flag" (func $memory_get_flag (param i32) (result i32)))
  (import "memory" "HEAD_SIZE" (global $memory_HEAD_SIZE i32))
  (import "memory" "USE_FLAG_INVALID" (global $memory_USE_FLAG_INVALID i32))
  (import "memory" "USE_FLAG_NON_USE" (global $memory_USE_FLAG_NON_USE i32))
  (import "memory" "USE_FLAG_USE" (global $memory_USE_FLAG_USE i32))
  (global $HEAD_SIZE i32 (i32.const 5))
  (global $FLAG_MARKED i32 (i32.const 0x1))
  (global $FLAG_IS_REFS i32 (i32.const 0x2))

  (func $get_flag_p (param $ref i32) (result i32)
    (i32.sub (get_local $ref) (i32.const 5))
  )

  (func $get_flag (param $ref i32) (result i32)
    (i32.load8_s (call $get_flag_p (get_local $ref)))
  )

  (func $set_flag (param $ref i32) (param $v i32)
    (i32.store8 (call $get_flag_p (get_local $ref)) (get_local $v))
  )

  (func $get_count_p (param $ref i32) (result i32)
    (i32.sub (get_local $ref) (i32.const 4))
  )

  (func $get_count (export "get_count") (param $ref i32) (result i32)
    (i32.load (call $get_count_p (get_local $ref)))
  )

  (func $set_count (param $ref i32) (param $v i32)
    (i32.store (call $get_count_p (get_local $ref)) (get_local $v))
  )

  (func $to_p (export "to_p") (param $ref i32) (result i32)
    (i32.sub (get_local $ref) (get_global $HEAD_SIZE))
  )

  (func $to_ref (export "to_ref") (param $p i32) (result i32)
    (i32.add (get_local $p) (get_global $HEAD_SIZE))
  )

  (func $on_bit_flag (param $ref i32) (param $flag i32)
    (call $set_flag (get_local $ref) (i32.or (call $get_flag (get_local $ref)) (get_local $flag)))
  )

  (func $off_bit_flag (param $ref i32) (param $flag i32)
    (call $set_flag (get_local $ref) (i32.and (call $get_flag (get_local $ref)) (i32.xor (get_local $flag) (i32.const -1))))
  )

  (func $get_bit_flag (param $ref i32) (param $flag i32) (result i32)
    (i32.and (call $get_flag (get_local $ref)) (get_local $flag))
  )

  (func $get_is_refs (export "get_is_refs") (param $ref i32) (result i32)
    (call $get_bit_flag (get_local $ref) (get_global $FLAG_IS_REFS))
  )

  (func $get_size (export "get_size") (param $ref i32) (result i32)
    (i32.sub (call $memory_get_size (call $to_p (get_local $ref))) (get_global $HEAD_SIZE))
  )

  (func $malloc (export "malloc") (param $size i32) (param $is_refs i32) (result i32)
    (local $ref i32)
    (set_local $ref (call $to_ref (call $memory_malloc (i32.add (get_local $size) (get_global $HEAD_SIZE)))))
    (call $set_count (get_local $ref) (i32.const 0))
    (if (get_local $is_refs)
      (then
        (call $set_flag (get_local $ref) (get_global $FLAG_IS_REFS))
      )
      (else
        (call $set_flag (get_local $ref) (i32.const 0))
      )
    )
    (get_local $ref)
  )

  (func $inc_count (export "inc_count") (param $ref i32)
    (call $set_count (get_local $ref) (i32.add (call $get_count (get_local $ref)) (i32.const 1)))
  )

  (func $dec_count (export "dec_count") (param $ref i32)
    (call $set_count (get_local $ref) (i32.sub (call $get_count (get_local $ref)) (i32.const 1)))
  )

  (func $mark
    (local $iter_p i32)
    (set_local $iter_p (get_global $memory_HEAD_SIZE))

    ;;全てのブロックを列挙
    loop $loop
      (if (i32.ne (call $memory_get_flag (get_local $iter_p)) (get_global $memory_USE_FLAG_INVALID))
        (then
          ;; 生きているなら
          (if (i32.eq (call $memory_get_flag (get_local $iter_p)) (get_global $memory_USE_FLAG_USE))
            (then
              ;;ルートセットに登録されてるなら
              (if (i32.ne (call $get_count (call $to_ref (get_local $iter_p))) (i32.const 0))
                (then
                  (call $mark_rec (call $to_ref (get_local $iter_p)))
                )
              )
            )
          )
          (set_local $iter_p (call $memory_get_next (get_local $iter_p)))
          br $loop
        )
      )
    end
  )

  (func $mark_rec (param $ref i32)
    (local $i i32)
    (local $n i32)
    ;;nullでない
    (if (i32.ne (get_local $ref) (i32.const 0))
      (then
        ;;使用中
        (if (i32.eq (call $memory_get_flag (call $to_p (get_local $ref))) (get_global $memory_USE_FLAG_USE))
          (then
            ;;マークされてない
            (if (i32.eqz (call $get_bit_flag (get_local $ref) (get_global $FLAG_MARKED)))
              (then
                (call $on_bit_flag (get_local $ref) (get_global $FLAG_MARKED))
                ;;ポインタセットなら再帰的にマーク
                (if (call $get_bit_flag (get_local $ref) (get_global $FLAG_IS_REFS))
                  (then
                    (set_local $i (i32.const 0))
                    (set_local $n (i32.div_s (call $get_size (get_local $ref)) (i32.const 4)))
                    loop $loop
                      (if (i32.lt_s (get_local $i) (get_local $n))
                        (then
                          (call $mark_rec (i32.load (i32.add (get_local $ref) (i32.mul (get_local $i) (i32.const 4)))))
                          (set_local $i (i32.add (get_local $i) (i32.const 1)))
                          br $loop
                        )
                      )
                    end
                  )
                )
              )
            )
          )
        )
      )
    )
  )

  (func $sweep
    (local $iter_p i32)
    (local $next i32)
    (local $new_p i32)
    (set_local $iter_p (get_global $memory_HEAD_SIZE))

    ;;全てのブロックを列挙
    block $block
      loop $loop
        (if (i32.ne (call $memory_get_flag (get_local $iter_p)) (get_global $memory_USE_FLAG_INVALID))
          (then
            (set_local $next (call $memory_get_next (get_local $iter_p)))
            ;; 生きているなら
            (if (i32.eq (call $memory_get_flag (get_local $iter_p)) (get_global $memory_USE_FLAG_USE))
              (then
                (if (call $get_bit_flag (call $to_ref (get_local $iter_p)) (get_global $FLAG_MARKED))
                  (then
                    ;;マークしてるならマーク外す
                    (call $off_bit_flag (call $to_ref (get_local $iter_p)) (get_global $FLAG_MARKED))
                  )
                  (else
                    ;;マークしてないなら解放
                    (set_local $new_p (call $memory_free (get_local $iter_p)))
                    ;;新しいポインタが0でなければnextにセット
                    (if (i32.ne (get_local $new_p) (i32.const 0))
                      (then
                        (set_local $next (call $memory_get_next (get_local $new_p)))
                      )
                      (else
                        br $block
                      )
                    )
                  )
                )
              )
            )
            (set_local $iter_p (get_local $next))
            br $loop
          )
        )
      end
    end
  )

  (func $run_gc (export "run_gc")
    (call $mark)
    (call $sweep)
  )
)