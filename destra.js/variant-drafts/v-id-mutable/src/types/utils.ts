// 1. 检查兼容性 (A 是否能赋值给 B)
// 类似于: const b: B = a as A;
export type Assignable<T, U> = T extends U ? true : false;

// 2. 检查严格相等 (A 和 B 是否完全一样)
// 这是一个比较 hack 的写法，能处理 any 和 readonly 等特殊情况
export type Equal<X, Y> = 
  (<T>() => T extends X ? 1 : 2) extends 
  (<T>() => T extends Y ? 1 : 2) ? true : false;

// 3. 断言工具 (如果 T 不是 true，编译器会报错)
export type Expect<T extends true> = T;
