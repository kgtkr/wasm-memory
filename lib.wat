(module
  (memory 1)
  ;;メモリレイアウト
  ;;フラグ(i32)(0:これ以降無効,1:未使用,2:使用中),サイズ(i32),データ領域
  (func $malloc (param $size i32) (result i32)
    (local $i i32)
    (local $c_flag i32)
    (local $c_size i32)
    ;;フラグが0でなければループ
    loop $loop
      (set_local $c_flag (i32.load (get_local $i)))
      (i32.ne (get_local $c_flag) (i32.const 0))
      if
        (set_local $c_size (i32.load (i32.add (get_local $i) (i32.const 4))))
        ;;未使用
        (i32.eq (get_local $c_flag) (i32.const 1))
        if
          ;;サイズと等しい
          (i32.eq (get_local $c_size) (get_local $size))
          if
            ;;未使用→使用中
            (i32.store (get_local $i) (i32.const 2))
            (return (get_local $i))
          end

          ;;求めるサイズ+8以上
          (i32.ge_s (get_local $c_size) (i32.add (get_local $size) (i32.const 8)))
          if
            ;;==使用部分==
            ;;未使用→使用中
            (i32.store (get_local $i) (i32.const 2))
            ;;サイズ
            (i32.store (i32.add (get_local $i) (i32.const 4)) (get_local $size))

            ;;==余り==
            ;;未使用
            (i32.store (i32.add (i32.add (get_local $i) (get_local $size)) (i32.const 8)) (i32.const 1))
            ;;サイズ
            (i32.store (i32.add (i32.add (get_local $i) (get_local $size)) (i32.const 12)) (i32.sub (get_local $c_size) (get_local $size)))
          
            (return (get_local $i))
          end
        end
        (set_local $i (i32.add (get_local $i) (i32.add (get_local $c_size) (i32.const 8))))
        br $loop
      end
    end

    ;;ラストに追加
    ;;使用中
    (i32.store (get_local $i) (i32.const 2))
    ;;サイズ
    (i32.store (i32.add (get_local $i) (i32.const 4)) (get_local $size))

    (return (get_local $i))
  )

  (func $free (param $p i32)
    
  )
)