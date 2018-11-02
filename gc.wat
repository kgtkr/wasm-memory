(module
    (import "resource" "memory" (memory 1))
    (import "memory" "malloc" (func $memory_malloc (param i32) (result i32)))
    (import "memory" "free" (func $memory_free (param i32)))
    (import "memory" "get_size" (func $memory_get_size (param i32) (result i32)))
    (import "memory" "get_next" (func $memory_get_next (param i32) (result i32)))

    (global $HEAD_SIZE i32 (i32.const 5))
)