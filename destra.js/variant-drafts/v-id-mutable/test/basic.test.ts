/**
 * Destra.js 基础功能测试/示例文件
 * 
 * 本文件展示了如何使用 Destra 的核心 API 来创建和管理数学表达式。
 * 这些示例涵盖了基本的表达式创建、变量声明、函数定义和使用等场景。
 * 
 * 注意，这里没有使用创作形式，而是模拟了预处理器的工作，手写标准形式。
 * （因为预处理器还没写，以及这个测试用例是基础功能测试，所以先这样x）
 */

import { expr, expl, type Expression, type VarExpl, type FuncExpl, type Substitutable, type Expl } from "../src/core/index";

// ============================================================================
// 1. 基础变量声明和表达式创建
// ============================================================================

console.log("=== 1. 基础变量声明和表达式创建 ===");

// 创建基础变量
const a = expl`a = 3` as VarExpl;
const b = expl`b = 5` as VarExpl;

console.log("变量 a:", a);
console.log("变量 b:", b);
console.log("a 的类型:", a.constructor.name);
console.log("a 是否为可嵌入:", a.isEmbeddable);
console.log("a 的依赖:", a.deps);

// 创建使用变量的表达式
const sum = expr`${a} + ${b}`;
console.log("表达式 sum:", sum);
console.log("sum 的依赖:", sum.deps);

// 创建复杂 id 表达式
const complexIdExpr = expr`_a1.1.sin.b.c_.8.x = 10`;  // 左边并非合法 id，识别为 implicit equation
const complexIdExpr2 = expr`_a1.1.sin.b.c_.8.c = 10`;  // 左边为合法 id，识别为 explicit equation
const complexIdExpl = expl`_a1.1.sin.b.c_.8.d = 10`;  // 左边为合法 id，识别为 variable
console.log("复杂 id 表达式(expr + 非法 id -> implicit equation):", complexIdExpr);
console.log("复杂 id 表达式(expr + 合法 id -> explicit equation):", complexIdExpr2);
console.log("复杂 id 表达式(expl + 合法 id -> variable):", complexIdExpl);
try {
    const complexIdExplIllegal = expl`_a1.1.sin.b.c_.8.x = 10`;  // 左边并非合法 id，抛出错误
} catch (error) {
    console.log("错误：", (error as Error).message, (error as Error).stack);
}

// 创建纯数值表达式
const pureExpr = expr`2 + 3`;
console.log("纯表达式:", pureExpr);

// ============================================================================
// 2. 函数定义和调用
// ============================================================================

console.log("\n=== 2. 函数定义和调用 ===");

// 箭头函数形式
const square = expl`(x) => x^2` as FuncExpl<(x: Substitutable) => Expression>;
console.log("函数 square:", square);
console.log("square 的参数:", (square as any).params);

// 调用函数
const result1 = square(5);
console.log("square(5):", result1);
console.log("result1 的依赖:", result1.deps);

// 多参数函数（注意：函数体中的表达式应该直接写在模板字符串中）
const distance = expl`(x, y) => sqrt(x^2 + y^2)` as FuncExpl<(x: Substitutable, y: Substitutable) => Expression>;
console.log("函数 distance:", distance);

// 具名函数形式
const namedFunc = expl`f(x) = x^2 + 1`;
console.log("具名函数 f:", namedFunc);
console.log("函数 id:", namedFunc.id());

// ============================================================================
// 3. 复杂表达式组合
// ============================================================================

console.log("\n=== 3. 复杂表达式组合 ===");

// 创建多个变量
const p = expl`p = 2` as VarExpl;
const q = expl`q = 3` as VarExpl;
const C = expr`1` as Expression;

// 使用多个变量构建复杂表达式
const complexExpr = expr`${p}^2 + ${q}^2 + ${p} * ${q} + ${C}`;
console.log("复杂表达式:", complexExpr);
console.log("复杂表达式的依赖数量:", complexExpr.deps.length);

// 嵌套函数调用
const add = (expl`(a, b) => a + b` as FuncExpl<(a: Substitutable, b: Substitutable) => Expression>).id("add", true);
const multiply = (expl`(a, b) => a * b` as FuncExpl<(a: Substitutable, b: Substitutable) => Expression>).id("multiply", true);
const combined1 = expr`${add}(${multiply}(${p}, ${q}), ${p})`;
console.log("嵌套函数调用 DSL嵌入写法:", combined1);
const combined2 = add(multiply(p, q), p);
console.log("嵌套函数调用 JS函数调用写法:", combined2);


// ============================================================================
// 4. 方程类型
// ============================================================================

console.log("\n=== 4. 方程类型 ===");

// 显式方程
const explicitEq = expr`y = x^2`;
console.log("显式方程:", explicitEq);
console.log("是否为可嵌入:", explicitEq.isEmbeddable);

// 隐式方程
const implicitEq = expr`x^2 + y^2 = 1`;
console.log("隐式方程:", implicitEq);
console.log("是否为可嵌入:", implicitEq.isEmbeddable);

// 不等式
const inequality = expr`x >= 0`;
console.log("不等式:", inequality);

// ============================================================================
// 5. ID 设置
// ============================================================================

console.log("\n=== 5. ID 设置 ===");

const myValue = (expl`myLib.myValue = 10` as VarExpl)
console.log("通过 DSL 代码设置 ID 的变量:", myValue);
console.log("ID 值:", myValue.id());

const myValue2 = (expl`10` as VarExpl)
console.log("未设置 ID 的变量:", myValue2);
myValue2.id("myLib.myValue2");
console.log("通过方法设置 ID 后:", myValue2);
console.log("ID 值:", myValue2.id());

// ============================================================================
// 6. 依赖关系验证
// ============================================================================

console.log("\n=== 6. 依赖关系验证 ===");

// 测试依赖收集
const base = expl`base = 10` as VarExpl;
const power = expl`power = 2` as VarExpl;
const calculation = expr`${base}^${power}`;

console.log("base 变量:", base);
console.log("power 变量:", power);
console.log("calculation 表达式:", calculation);
console.log("calculation 依赖的变量:", calculation.deps.map(d => {
    // 检查是否为 VarExpl 类型
    if (d.constructor.name === "VarExpl") {
        return `VarExpl(${(d as VarExpl).id() || ""})`;
    }
    return d.constructor.name;
}));

// ============================================================================
// 7. 错误处理示例
// ============================================================================

console.log("\n=== 7. 错误处理示例 ===");

// 测试不可嵌入的表达式作为依赖（应该抛出错误）
try {
    const invalid = expr`y = x^2`; // 这是一个显式方程，不可嵌入
    // 注意：TypeScript 类型检查可能会阻止这个，但运行时也会检查
    const shouldFail = expr`${invalid as any} + 1`; // 这应该失败
    console.log("错误：应该抛出异常但没有");
} catch (error) {
    console.log("✓ 正确捕获错误:", (error as Error).message);
}

// ============================================================================
// 8. 实际数学场景示例
// ============================================================================

console.log("\n=== 8. 实际数学场景示例 ===");

// 创建一个简单的物理场景：计算速度
const velocity = expl`my.v = 10` as VarExpl;  // 速度 10 m/s
const time = expl`my.t = 5` as VarExpl;        // 时间 5 s
const distance_calc = expr`${velocity} * ${time}`;  // 距离 = 速度 × 时间

console.log("物理场景:");
console.log("  速度:", velocity);
console.log("  时间:", time);
console.log("  距离计算:", distance_calc);

// 创建一个几何场景：圆的方程
const radius = expl`my.r = 3` as VarExpl;
const circle = expr`x^2 + y^2 = ${radius}^2`;
console.log("\n几何场景:");
console.log("  半径:", radius);
console.log("  圆的方程:", circle);

// ============================================================================
// 总结
// ============================================================================

console.log("\n=== 测试完成 ===");
console.log("所有基础功能测试已执行。");
console.log("\n提示：");
console.log("- 当前实现支持变量声明、函数定义、表达式组合等基础功能");
console.log("- ID 设置和样式 API 等功能可能仍在开发中");
console.log("- 更多高级功能（如 selection、builder）请参考文档");

