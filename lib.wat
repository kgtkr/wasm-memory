(module
  (import "imports" "memory" (memory 1))
  (global $START i32 (i32.const 0))
  (global $HEAD_SIZE i32 (i32.const 9))
  (global $FLAG_INVALID i32 (i32.const 0))
  (global $FLAG_NON_USE i32 (i32.const 1))
  (global $FLAG_USE i32 (i32.const 2))

  (func $get_data_p (export "get_data_p") (param $p i32) (result i32)
    (i32.add (get_local $p) (get_global $HEAD_SIZE))
  )

  (func $get_flag_p (param $p i32) (result i32)
    get_local $p
  )

  (func $get_flag (param $p i32) (result i32)
    (i32.load8_s (call $get_flag_p (get_local $p)))
  )

  (func $set_flag (param $p i32) (param $v i32)
    (i32.store8 (call $get_flag_p (get_local $p)) (get_local $v))
  )

  (func $get_size_p (param $p i32) (result i32)
    (i32.add (get_local $p) (i32.const 1))
  )

  (func $get_size (param $p i32) (result i32)
    (i32.load (call $get_size_p (get_local $p)))
  )

  (func $set_size (param $p i32) (param $v i32)
    (i32.store (call $get_size_p (get_local $p)) (get_local $v))
  )

  (func $get_prev_p (param $p i32) (result i32)
    (i32.add (get_local $p) (i32.const 5))
  )

  (func $get_prev (param $p i32) (result i32)
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

  (func $get_next (param $p i32) (result i32)
    (i32.add (i32.add (get_local $p) (get_global $HEAD_SIZE)) (call $get_size (get_local $p)))
  )

  ;;メモリレイアウト
  ;;フラグ(i8)(0:これ以降無効,1:未使用,2:使用中),サイズ(i32),前のポインタ(i32),データ領域
  (func $malloc (export "malloc") (param $size i32) (result i32)
    (local $i i32)
    (local $prev i32)
    (local $old_size i32)
    ;;無効でなければループ
    loop $loop
      (if (i32.ne (call $get_flag (get_local $i)) (get_global $FLAG_INVALID))
        (then
          ;;未使用
          (if (i32.eq (call $get_flag (get_local $i)) (get_global $FLAG_NON_USE))
            (then
              ;;サイズと等しい
              (if (i32.eq (call $get_size (get_local $i)) (get_local $size))
                (then
                  ;;未使用→使用中
                  (call $set_flag (get_local $i) (get_global $FLAG_USE))
                  (return (get_local $i))
                )
              )

              ;;要求サイズ+9以上
              (set_local $old_size (call $get_size (get_local $i)))
              (if (i32.ge_s (get_local $old_size) (i32.add (get_local $size) (get_global $HEAD_SIZE)))
                (then
                  ;;==使用部分==
                  (call $set_block (get_local $i) (get_global $FLAG_USE) (get_local $size) (get_local $prev))
                  
                  ;;==余り==
                  (call $set_block (call $get_next (get_local $i)) (get_global $FLAG_NON_USE) (i32.sub (get_local $old_size) (i32.add (get_local $size) (get_global $HEAD_SIZE))) (get_local $i))
                  
                  ;;==次==
                  (call $set_prev (call $get_prev_p (call $get_next (call $get_next (get_local $i)))) (call $get_next (get_local $i)))

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

    ;;ラストに追加
    (call $set_block (get_local $i) (get_global $FLAG_USE) (get_local $size) (get_local $prev))

    (return (get_local $i))
  )

  (func $free (export "free") (param $p i32)
    (local $size i32)
    (local $prev i32)

    (set_local $size (call $get_size (get_local $p)))
    (set_local $prev (call $get_prev (get_local $p)))

    ;;先頭ポインタでないかつ前が空いているか
    (if (i32.and (i32.ne (get_local $p) (get_global $START)) (i32.eq (call $get_flag (get_local $prev)) (get_global $FLAG_NON_USE)))
      (then
        (set_local $p (get_local $prev))
        (set_local $prev (call $get_prev (get_local $p)))
        (set_local $size (i32.add (get_local $size) (i32.add (call $get_size (get_local $p)) (get_global $HEAD_SIZE))))
      )
    )

    ;;次が空いているか
    (if (i32.eq (call $get_flag (call $get_next (get_local $p))) (get_global $FLAG_NON_USE))
      (then
        (set_local $size (i32.add (get_local $size) (i32.add (call $get_size (call $get_next (get_local $p))) (get_global $HEAD_SIZE))))
      )
    )

    (call $set_block (get_local $p) (get_global $FLAG_NON_USE) (get_local $size) (get_local $prev))
  )
)