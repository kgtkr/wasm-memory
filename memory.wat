(module
  (import "resource" "memory" (memory 1))
  (global $HEAD_SIZE (export "HEAD_SIZE") i32 (i32.const 9))
  (global $USE_FLAG_INVALID (export "USE_FLAG_INVALID") i32 (i32.const 0))
  (global $USE_FLAG_NON_USE (export "USE_FLAG_NON_USE") i32 (i32.const 1))
  (global $USE_FLAG_USE (export "USE_FLAG_USE") i32 (i32.const 2))

  (func $get_flag_p (param $p i32) (result i32)
    (i32.sub (get_local $p) (i32.const 9))
  )

  (func $get_flag (export "get_flag") (param $p i32) (result i32)
    (i32.load8_u (call $get_flag_p (get_local $p)))
  )

  (func $set_flag (param $p i32) (param $v i32)
    (i32.store8 (call $get_flag_p (get_local $p)) (get_local $v))
  )

  (func $get_size_p (param $p i32) (result i32)
    (i32.sub (get_local $p) (i32.const 8))
  )

  (func $get_size (export "get_size") (param $p i32) (result i32)
    (i32.load (call $get_size_p (get_local $p)))
  )

  (func $set_size (param $p i32) (param $v i32)
    (i32.store (call $get_size_p (get_local $p)) (get_local $v))
  )

  (func $get_prev_p (param $p i32) (result i32)
    (i32.sub (get_local $p) (i32.const 4))
  )

  (func $get_prev (export "get_prev") (param $p i32) (result i32)
    (i32.load (call $get_prev_p (get_local $p)))
  )

  (func $set_prev (param $p i32) (param $v i32)
    (i32.store (call $get_prev_p (get_local $p)) (get_local $v))
  )

  (func $set_block (param $p i32) (param $flag i32) (param $size i32) (param $prev i32)
    (call $set_flag (get_local $p) (get_local $flag))
    (call $set_size (get_local $p) (get_local $size))
    (call $set_prev (get_local $p) (get_local $prev))
  )

  (func $get_next (export "get_next") (param $p i32) (result i32)
    (i32.add (i32.add (get_local $p) (call $get_size (get_local $p))) (get_global $HEAD_SIZE))
  )

  (func $malloc (export "malloc") (param $size i32) (result i32)
    (local $i i32)
    (local $prev i32)
    (local $old_size i32)

    (set_local $i (get_global $HEAD_SIZE))

    ;;無効でなければループ
    loop $loop
      (if (i32.ne (call $get_flag (get_local $i)) (get_global $USE_FLAG_INVALID))
        (then
          ;;未使用
          (if (i32.eq (call $get_flag (get_local $i)) (get_global $USE_FLAG_NON_USE))
            (then
              ;;サイズと等しい
              (if (i32.eq (call $get_size (get_local $i)) (get_local $size))
                (then
                  ;;未使用→使用中
                  (call $set_flag (get_local $i) (get_global $USE_FLAG_USE))
                  (return (get_local $i))
                )
              )

              ;;要求サイズ+ヘッダサイズ以上
              (set_local $old_size (call $get_size (get_local $i)))
              (if (i32.ge_s (get_local $old_size) (i32.add (get_local $size) (get_global $HEAD_SIZE)))
                (then
                  ;;==使用部分==
                  (call $set_block (get_local $i) (get_global $USE_FLAG_USE) (get_local $size) (get_local $prev))
                  
                  ;;==余り==
                  (call $set_block (call $get_next (get_local $i)) (get_global $USE_FLAG_NON_USE) (i32.sub (get_local $old_size) (i32.add (get_local $size) (get_global $HEAD_SIZE))) (get_local $i))
                  
                  ;;==次==
                  (call $set_prev (call $get_next (call $get_next (get_local $i))) (call $get_next (get_local $i)))

                  (return (get_local $i))
                )
              )
            )
          )
          (set_local $prev (get_local $i))
          (set_local $i (call $get_next (get_local $i)))
          br $loop
        )
      )
    end

    ;;ラストに追加し、次のブロックを無効にする
    (call $set_block (get_local $i) (get_global $USE_FLAG_USE) (get_local $size) (get_local $prev))
    (call $set_flag (call $get_next (get_local $i)) (get_global $USE_FLAG_INVALID))

    (return (get_local $i))
  )

  (func $join_prev (param $p i32) (result i32)
    (local $size i32)
    (local $prev i32)
    (local $next i32)

    (set_local $prev (call $get_prev (get_local $p)))
    (set_local $next (call $get_next (get_local $p)))
    (set_local $size (i32.add (call $get_size (call $get_prev (get_local $p))) (i32.add (call $get_size (get_local $p)) (get_global $HEAD_SIZE))))

    (call $set_size (get_local $prev) (get_local $size))
    (if (i32.ne (call $get_flag (get_local $next)) (get_global $USE_FLAG_INVALID))
      (then
        (call $set_prev (get_local $next) (get_local $prev))
      )
    )

    (get_local $prev)
  )

  (func $join_next (param $p i32)
    (local $size i32)
    (local $next_next i32)

    (set_local $size (i32.add (call $get_size (call $get_next (get_local $p))) (i32.add (call $get_size (get_local $p)) (get_global $HEAD_SIZE))))
    (set_local $next_next (call $get_next (call $get_next (get_local $p))))

    (call $set_size (get_local $p) (get_local $size))
    (if (i32.ne (call $get_flag (get_local $next_next)) (get_global $USE_FLAG_INVALID))
      (then
        (call $set_prev (get_local $next_next) (get_local $p))
      )
    )
  )

  ;;このブロックの新しいポインタを返す
  (func $free (export "free") (param $p i32) (result i32)
    (local $new_p i32)
    (set_local $new_p (get_local $p))
    ;;先頭ポインタでないかつ前が空いているならjoin
    (if (i32.ne (get_local $p) (get_global $HEAD_SIZE))
      (then
        (if (i32.eq (call $get_flag (call $get_prev (get_local $p))) (get_global $USE_FLAG_NON_USE))
          (then
            (set_local $new_p (call $get_prev (get_local $p)))
            (set_local $p (call $join_prev (get_local $p)))
          )
        )
      )
    )

    ;;後ろが空いているならjoin
    (if (i32.eq (call $get_flag (call $get_next (get_local $p))) (get_global $USE_FLAG_NON_USE))
      (then
        (call $join_next (get_local $p))
      )
    )

    (if (i32.eq (call $get_flag (call $get_next (get_local $p))) (get_global $USE_FLAG_INVALID))
      ;;次が無効
      (then
        (set_local $new_p (i32.const 0))
        (call $set_flag (get_local $p) (get_global $USE_FLAG_INVALID))
      )
      (else
        (call $set_flag (get_local $p) (get_global $USE_FLAG_NON_USE))
      )
    )
    (get_local $new_p)
  )
)