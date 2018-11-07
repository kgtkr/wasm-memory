# WASM Runtime

[![Build Status](https://travis-ci.org/kgtkr/wasm-memory.svg?branch=master)](https://travis-ci.org/kgtkr/wasm-memory)

## ブロック(memory.wat)
|サイズ|名前|説明|
|:-|:-|:-|
|1|flag|ここから先無効:0、未使用:1、使用中:2|
|4|size|ボディのサイズ|
|4|prev|前ブロックのポインタ。先頭ブロックなら0|
|任意|body|本体|

## ブロック(gc.wat)
|サイズ|名前|説明|
|:-|:-|:-|
|1|flag|1bit目:マークされてるか、2bit目:リファレンスセットであるか|
|4|count|ルートセットの参照カウント|
|任意|body|本体|