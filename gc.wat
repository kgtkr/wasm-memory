(module
    (import "resource" "memory" (memory 1))
    (import "memory" "malloc" (func $malloc (param i32) (result i32)))
    (import "memory" "free" (func $free (param i32)))
)