(module
  (type $FUNCSIG$vi (func (param i32)))
  (import "env" "log" (func $log (param i32)))
  (table 0 anyfunc)
  (memory $0 1)
  (data (i32.const 16) "Hi!\00")
  (export "memory" (memory $0))
  (export "greet" (func $greet))
  (func $greet
    (call $log
      (i32.const 16)
    )
  )
)
