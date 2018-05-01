(module
  ;;メモリレイアウト
  ;;フラグ(i32,0:未使用,1:使用中,2:これ以降無効),サイズ(i32),データ領域
  (func $malloc (param $size i32) (result i32)
    i32.const 0
  )

  (func $free (param $p i32)
    
  )
)