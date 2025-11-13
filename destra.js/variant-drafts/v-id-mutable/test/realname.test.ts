/**
 * Destra.js realname 方法测试文件
 * 
 * 本文件专门测试 `.realname()` 方法的功能，包括：
 * - 基本设置和获取功能
 * - 链式调用支持
 * - Desmos 变量名格式验证
 * - 与 ID 的关系
 * - 各种边界情况和特殊字符支持
 * 
 * 注意：这里没有使用创作形式，而是模拟了预处理器的工作，手写标准形式。
 */

import { expl, type VarExpl, type FuncExpl, type Substitutable } from "../src/core/index";

// ============================================================================
// 1. 基本设置和获取功能
// ============================================================================

console.log("=== 1. 基本设置和获取功能 ===");

// 测试基本设置和获取
const vec1 = expl`(1, 2)` as VarExpl;
vec1.id("physics.vec");
vec1.realname("v");
console.log("✓ 设置 realname 后获取:", vec1.realname()); // 应该输出 "v"
console.log("✓ ID 保持不变:", vec1.id()); // 应该输出 "physics.vec"

// 测试未设置时返回 undefined
const vec2 = expl`(3, 4)` as VarExpl;
vec2.id("math.vec");
console.log("✓ 未设置 realname 时:", vec2.realname()); // 应该输出 undefined

// 测试可以覆盖已设置的 realname
vec1.realname("v_elocity");
console.log("✓ 覆盖 realname 后:", vec1.realname()); // 应该输出 "velocity"

// ============================================================================
// 2. 链式调用支持
// ============================================================================

console.log("\n=== 2. 链式调用支持 ===");

// 测试链式调用
const vec3 = expl`(5, 6)` as VarExpl;
vec3.id("physics.vector").realname("v_ec");
console.log("✓ 链式调用后 ID:", vec3.id()); // 应该输出 "physics.vector"
console.log("✓ 链式调用后 realname:", vec3.realname()); // 应该输出 "vec"

// 测试多次链式调用
const vec4 = expl`(7, 8)` as VarExpl;
vec4.id("math.vector").realname("v_1").realname("v_2");
console.log("✓ 多次链式调用后 realname:", vec4.realname()); // 应该输出 "v2"

// ============================================================================
// 3. 合法格式测试：普通字母
// ============================================================================

console.log("\n=== 3. 合法格式测试：普通字母 ===");

// 单个字母
const a = expl`10` as VarExpl;
a.realname("a");
console.log("✓ 单个字母:", a.realname());

// 单个字母 + 下划线 + 数字下标
const a1 = expl`20` as VarExpl;
a1.realname("a_1");
console.log("✓ 字母+数字下标:", a1.realname());

// 单个字母 + 下划线 + 字母下标
const ab = expl`30` as VarExpl;
ab.realname("a_b");
console.log("✓ 字母+字母下标:", ab.realname());

// 单个字母 + 下划线 + 混合下标
const a1xy = expl`40` as VarExpl;
a1xy.realname("a_1xy");
console.log("✓ 字母+混合下标:", a1xy.realname());

// 单个字母 + 下划线 + 复杂下标
const a1xy2z = expl`50` as VarExpl;
a1xy2z.realname("a_1xy2z");
console.log("✓ 字母+复杂下标:", a1xy2z.realname());

// ============================================================================
// 4. 合法格式测试：希腊字母别名
// ============================================================================

console.log("\n=== 4. 合法格式测试：希腊字母别名 ===");

// 小写希腊字母别名
const alpha = expl`1` as VarExpl;
alpha.realname("alpha");
console.log("✓ 小写希腊字母别名:", alpha.realname());

const beta = expl`2` as VarExpl;
beta.realname("beta");
console.log("✓ 小写希腊字母别名:", beta.realname());

// 大写希腊字母别名
const Alpha = expl`3` as VarExpl;
Alpha.realname("Alpha");
console.log("✓ 大写希腊字母别名:", Alpha.realname());

const Omega = expl`4` as VarExpl;
Omega.realname("Omega");
console.log("✓ 大写希腊字母别名:", Omega.realname());

// 希腊字母别名 + 下标
const alpha1 = expl`5` as VarExpl;
alpha1.realname("alpha_1");
console.log("✓ 希腊字母别名+下标:", alpha1.realname());

const alpha1xy = expl`6` as VarExpl;
alpha1xy.realname("alpha_1xy2z");
console.log("✓ 希腊字母别名+复杂下标:", alpha1xy.realname());

// ============================================================================
// 5. 合法格式测试：希腊字母字符本身（会被转换为 alias）
// ============================================================================

console.log("\n=== 5. 合法格式测试：希腊字母字符本身（会被转换为 alias） ===");

// 小写希腊字母字符 - 会被转换为对应的 alias
const α = expl`10` as VarExpl;
α.realname("α");
console.log("✓ 小写希腊字母字符 (α -> alpha):", α.realname()); // 应该输出 "alpha"

const β = expl`20` as VarExpl;
β.realname("β");
console.log("✓ 小写希腊字母字符 (β -> beta):", β.realname()); // 应该输出 "beta"

const ω = expl`30` as VarExpl;
ω.realname("ω");
console.log("✓ 小写希腊字母字符 (ω -> omega):", ω.realname()); // 应该输出 "omega"

// 大写希腊字母字符 - 会被转换为对应的 alias
const Α = expl`40` as VarExpl;
Α.realname("Α");
console.log("✓ 大写希腊字母字符 (Α -> Alpha):", Α.realname()); // 应该输出 "Alpha"

const Ω = expl`50` as VarExpl;
Ω.realname("Ω");
console.log("✓ 大写希腊字母字符 (Ω -> Omega):", Ω.realname()); // 应该输出 "Omega"

// 希腊字母字符 + 下标 - 头部字符会被转换为 alias，下标保持不变
const α1 = expl`60` as VarExpl;
α1.realname("α_1");
console.log("✓ 希腊字母字符+下标 (α_1 -> alpha_1):", α1.realname()); // 应该输出 "alpha_1"

const α1xy = expl`70` as VarExpl;
α1xy.realname("α_1xy2z");
console.log("✓ 希腊字母字符+复杂下标 (α_1xy2z -> alpha_1xy2z):", α1xy.realname()); // 应该输出 "alpha_1xy2z"

// ============================================================================
// 6. 非法格式测试
// ============================================================================

console.log("\n=== 6. 非法格式测试 ===");

// 测试空字符串
try {
    const invalid1 = expl`100` as VarExpl;
    invalid1.realname("");
    console.log("✗ 错误：空字符串应该抛出异常");
} catch (error) {
    console.log("✓ 正确捕获空字符串错误:", (error as Error).message);
}

// 测试数字开头
try {
    const invalid2 = expl`200` as VarExpl;
    invalid2.realname("1a");
    console.log("✗ 错误：数字开头应该抛出异常");
} catch (error) {
    console.log("✓ 正确捕获数字开头错误:", (error as Error).message);
}

// 测试下划线开头
try {
    const invalid3 = expl`300` as VarExpl;
    invalid3.realname("_a");
    console.log("✗ 错误：下划线开头应该抛出异常");
} catch (error) {
    console.log("✓ 正确捕获下划线开头错误:", (error as Error).message);
}

// 测试多个下划线
try {
    const invalid4 = expl`400` as VarExpl;
    invalid4.realname("a__1");
    console.log("✗ 错误：多个下划线应该抛出异常");
} catch (error) {
    console.log("✓ 正确捕获多个下划线错误:", (error as Error).message);
}

// 测试下划线后为空
try {
    const invalid5 = expl`500` as VarExpl;
    invalid5.realname("a_");
    console.log("✗ 错误：下划线后为空应该抛出异常");
} catch (error) {
    console.log("✓ 正确捕获下划线后为空错误:", (error as Error).message);
}

// 测试包含特殊字符
try {
    const invalid6 = expl`600` as VarExpl;
    invalid6.realname("a-b");
    console.log("✗ 错误：包含特殊字符应该抛出异常");
} catch (error) {
    console.log("✓ 正确捕获特殊字符错误:", (error as Error).message);
}

// 测试包含空格
try {
    const invalid7 = expl`700` as VarExpl;
    invalid7.realname("a b");
    console.log("✗ 错误：包含空格应该抛出异常");
} catch (error) {
    console.log("✓ 正确捕获空格错误:", (error as Error).message);
}

// 测试包含点号
try {
    const invalid8 = expl`800` as VarExpl;
    invalid8.realname("a.b");
    console.log("✗ 错误：包含点号应该抛出异常");
} catch (error) {
    console.log("✓ 正确捕获点号错误:", (error as Error).message);
}

// 测试下标包含希腊字母
try {
    const invalid9 = expl`900` as VarExpl;
    invalid9.realname("alpha_α");
    console.log("✗ 错误：下标包含希腊字母应该抛出异常");
} catch (error) {
    console.log("✓ 正确捕获希腊字母错误:", (error as Error).message);
}

// ============================================================================
// 7. realname 与 ID 的关系
// ============================================================================

console.log("\n=== 7. realname 与 ID 的关系 ===");

// realname 应该独立于 ID，可以设置不同的值
const vec5 = expl`(1, 2)` as VarExpl;
vec5.id("physics.velocity");
vec5.realname("v");
console.log("✓ ID 和 realname 可以不同:");
console.log("  - ID:", vec5.id()); // "physics.velocity"
console.log("  - realname:", vec5.realname()); // "v"

// 修改 ID 不应该影响 realname
vec5.id("math.speed");
console.log("✓ 修改 ID 后 realname 保持不变:");
console.log("  - ID:", vec5.id()); // "math.speed"
console.log("  - realname:", vec5.realname()); // "v"

// 修改 realname 不应该影响 ID
vec5.realname("v_elocity");
console.log("✓ 修改 realname 后 ID 保持不变:");
console.log("  - ID:", vec5.id()); // "math.speed"
console.log("  - realname:", vec5.realname()); // "velocity"

// ============================================================================
// 8. 函数声明的 realname 测试
// ============================================================================

console.log("\n=== 8. 函数声明的 realname 测试 ===");

// 测试函数也可以设置 realname
const square = expl`(x) => x^2` as FuncExpl<(x: Substitutable) => any>;
square.id("math.square");
square.realname("s_q");
console.log("✓ 函数的 ID:", square.id()); // "math.square"
console.log("✓ 函数的 realname:", square.realname()); // "sq"

// 测试具名函数也可以设置 realname
const namedFunc = expl`fn(x) = x^2 + 1` as FuncExpl<(x: Substitutable) => any>;
namedFunc.realname("f");
console.log("✓ 具名函数的 realname:", namedFunc.realname()); // "f"

// ============================================================================
// 9. 实际使用场景示例
// ============================================================================

console.log("\n=== 9. 实际使用场景示例 ===");

// 场景：使用 realname 实现"键盘输入 Hack"
// 即使 ID 是复杂的命名空间结构，也可以使用简单的 Desmos 变量名
const gravity = expl`(0, -9.8)` as VarExpl;
gravity.id("physics.constants.gravity");
gravity.realname("g");
console.log("✓ 物理常量示例:");
console.log("  - ID:", gravity.id()); // "physics.constants.gravity"
console.log("  - realname:", gravity.realname()); // "g"

const velocity = expl`10` as VarExpl;
velocity.id("physics.kinematics.velocity");
velocity.realname("v");
console.log("✓ 速度变量示例:");
console.log("  - ID:", velocity.id()); // "physics.kinematics.velocity"
console.log("  - realname:", velocity.realname()); // "v"

// 场景：使用希腊字母作为 realname（字符会被转换为 alias）
const angle = expl`pi/4` as VarExpl;
angle.id("geometry.angle");
angle.realname("θ");
console.log("✓ 角度变量示例:");
console.log("  - ID:", angle.id()); // "geometry.angle"
console.log("  - realname:", angle.realname()); // "theta" (θ 被转换为 alias)

// ============================================================================
// 10. 边界情况测试
// ============================================================================

console.log("\n=== 10. 边界情况测试 ===");

// 测试单个字符的 realname
const x = expl`1` as VarExpl;
x.realname("x");
console.log("✓ 单个字符 realname:", x.realname());

// 测试很长的下标
const longSub = expl`2` as VarExpl;
longSub.realname("a_1234567890abcdef");
console.log("✓ 长下标 realname:", longSub.realname());

// 测试所有希腊字母别名（抽样测试几个）
const testGreekAliases = ["alpha", "beta", "gamma", "delta", "omega"];
for (const alias of testGreekAliases) {
    const testVar = expl`1` as VarExpl;
    testVar.realname(alias);
    console.log(`✓ 希腊字母别名 ${alias}:`, testVar.realname());
}

// ============================================================================
// 总结
// ============================================================================

console.log("\n=== 测试完成 ===");
console.log("realname 方法的所有测试已执行。");
console.log("\n提示：");
console.log("- realname 方法支持设置和获取 Desmos 变量名");
console.log("- 支持链式调用");
console.log("- 支持普通字母、希腊字母别名和字符");
console.log("- 希腊字母字符会被自动转换为对应的 alias（如 α -> alpha）");
console.log("- 支持下标（下划线+字母数字组合）");
console.log("- 格式验证会拒绝非法输入");
console.log("- realname 独立于 ID，可以设置不同的值");

