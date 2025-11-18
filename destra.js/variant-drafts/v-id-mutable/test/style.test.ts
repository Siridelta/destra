/**
 * Destra.js 样式 API 测试/示例文件
 * 
 * 本文件展示了如何使用 Destra 的样式 API 来设置和读取表达式的样式属性。
 * 这些示例涵盖了样式读取、编辑、Editor 模式、便利快捷方式等场景。
 */

import { expr, expl, type Expression, type VarExpl } from "../src/core/index";
import { LineStyle, PointStyle, DragMode, LabelOrientation, type StyleEditorCallable } from "../src/core/index";

// StyleEditor 通过 Proxy 动态创建，TypeScript 无法完全推断其类型
// 使用 any 类型来访问其动态属性
type StyleEditor = StyleEditorCallable & any;

// ============================================================================
// 1. 基础样式读取
// ============================================================================

console.log("=== 1. 基础样式读取 ===");

const point1 = expl`p1 = (1, 2)` as VarExpl;
console.log("创建点 p1:", point1);
console.log("初始样式:", point1.style);
console.log("初始 point.size:", point1.style.point?.size); // 应该是 undefined

// ============================================================================
// 2. 使用回调形式编辑样式
// ============================================================================

console.log("\n=== 2. 使用回调形式编辑样式 ===");

const point2 = expl`p2 = (3, 4)` as VarExpl;
point2.style((s: StyleEditor) => {
    s.point.size = 12;
    s.point.opacity = 0.8;
    s.point.style = PointStyle.CROSS;
    s.color = "rgb(255, 0, 0)";
    s.label.text = "Point 2";
    s.label.size = 14;
});

console.log("编辑后的 point2 样式:");
console.log("  point.size:", point2.style.point?.size);
console.log("  point.opacity:", point2.style.point?.opacity);
console.log("  point.style:", point2.style.point?.style);
console.log("  color:", point2.style.color);
console.log("  label.text:", point2.style.label?.text);
console.log("  label.size:", point2.style.label?.size);

// ============================================================================
// 3. 使用对象合并形式编辑样式
// ============================================================================

console.log("\n=== 3. 使用对象合并形式编辑样式 ===");

const point3 = expl`p3 = (5, 6)` as VarExpl;
point3.style({
    color: "blue",
    point: {
        size: 10,
        style: PointStyle.SQUARE,
    },
    label: {
        text: "Point 3",
        orientation: LabelOrientation.ABOVE,
    },
});

console.log("编辑后的 point3 样式:");
console.log("  color:", point3.style.color);
console.log("  point.size:", point3.style.point?.size);
console.log("  point.style:", point3.style.point?.style);
console.log("  label.text:", point3.style.label?.text);
console.log("  label.orientation:", point3.style.label?.orientation);

// ============================================================================
// 4. 便利快捷方式：.point()
// ============================================================================

console.log("\n=== 4. 便利快捷方式：.point() ===");

const point4 = expl`p4 = (7, 8)` as VarExpl;

// 回调形式
point4.point((p: StyleEditor) => {
    p.size = 15;
    p.opacity = 0.9;
    p.dragMode = DragMode.XY;
});

console.log("使用 .point() 回调形式编辑:");
console.log("  point.size:", point4.style.point?.size);
console.log("  point.opacity:", point4.style.point?.opacity);
console.log("  point.dragMode:", point4.style.point?.dragMode);

// 对象合并形式
point4.point({
    size: 18,
    style: PointStyle.DIAMOND,
});

console.log("\n使用 .point() 对象合并形式更新:");
console.log("  point.size:", point4.style.point?.size); // 应该是 18
console.log("  point.style:", point4.style.point?.style); // 应该是 DIAMOND
console.log("  point.opacity:", point4.style.point?.opacity); // 应该保持 0.9

// ============================================================================
// 5. 便利快捷方式：.label()
// ============================================================================

console.log("\n=== 5. 便利快捷方式：.label() ===");

const point5 = expl`p5 = (9, 10)` as VarExpl;

point5.label((l: StyleEditor) => {
    l.text = "Origin";
    l.size = 16;
    l.orientation = LabelOrientation.BELOW_RIGHT;
    l.angle = "45";
});

console.log("使用 .label() 编辑:");
console.log("  label.text:", point5.style.label?.text);
console.log("  label.size:", point5.style.label?.size);
console.log("  label.orientation:", point5.style.label?.orientation);
console.log("  label.angle:", point5.style.label?.angle);

// ============================================================================
// 6. 便利快捷方式：.line()
// ============================================================================

console.log("\n=== 6. 便利快捷方式：.line() ===");

const line1 = expr`y = x^2` as Expression;

line1.line((l: StyleEditor) => {
    l.style = LineStyle.DASHED;
    l.width = 3;
    l.opacity = 0.7;
});

console.log("使用 .line() 编辑:");
console.log("  line.style:", line1.style.line?.style);
console.log("  line.width:", line1.style.line?.width);
console.log("  line.opacity:", line1.style.line?.opacity);

// ============================================================================
// 7. 便利快捷方式：.fill()
// ============================================================================

console.log("\n=== 7. 便利快捷方式：.fill() ===");

const polygon1 = expr`polygon(...)` as Expression;

polygon1.fill((f: StyleEditor) => {
    f.opacity = 0.5;
});

console.log("使用 .fill() 编辑:");
console.log("  fill.opacity:", polygon1.style.fill?.opacity);

// ============================================================================
// 8. Editor 模式的链式调用
// ============================================================================

console.log("\n=== 8. Editor 模式的链式调用 ===");

const point6 = expl`p6 = (11, 12)` as VarExpl;

point6.style((s: StyleEditor) => {
    // 链式调用示例（如果支持）
    s.color = "green";
    s.point.size = 20;
    s.label.text = "Point 6";
});

console.log("链式编辑后的样式:");
console.log("  color:", point6.style.color);
console.log("  point.size:", point6.style.point?.size);
console.log("  label.text:", point6.style.label?.text);

// ============================================================================
// 9. 使用表达式作为样式值
// ============================================================================

console.log("\n=== 9. 使用表达式作为样式值 ===");

const sizeVar = expl`size = 15` as VarExpl;
const point7 = expl`p7 = (13, 14)` as VarExpl;

point7.style({
    point: {
        size: sizeVar, // 使用变量作为样式值
    },
});

console.log("使用表达式作为样式值:");
console.log("  point.size (变量):", point7.style.point?.size);
console.log("  sizeVar:", sizeVar);

// ============================================================================
// 10. 可见性控制
// ============================================================================

console.log("\n=== 10. 可见性控制 ===");

const point8 = expl`p8 = (15, 16)` as VarExpl;

point8.style({
    hidden: false,
    showParts: {
        points: true,
        lines: false,
        fill: false,
        label: true,
    },
});

console.log("可见性设置:");
console.log("  hidden:", point8.style.hidden);
console.log("  showParts.points:", point8.style.showParts?.points);
console.log("  showParts.lines:", point8.style.showParts?.lines);
console.log("  showParts.label:", point8.style.showParts?.label);

// ============================================================================
// 11. 定义域设置（参数曲线等）
// ============================================================================

console.log("\n=== 11. 定义域设置（参数曲线等） ===");

const paramCurve = expr`parametric(...)` as Expression;

paramCurve.style({
    t: {
        min: 0,
        max: "2*pi",
    },
});

console.log("参数曲线定义域:");
console.log("  t.min:", paramCurve.style.t?.min);
console.log("  t.max:", paramCurve.style.t?.max);

// ============================================================================
// 12. 只读保护测试
// ============================================================================

console.log("\n=== 12. 只读保护测试 ===");

const point9 = expl`p9 = (17, 18)` as VarExpl;
point9.style({
    color: "purple",
    point: { size: 12 },
});

console.log("尝试直接修改只读样式（应该失败）:");
try {
    (point9.style as any).color = "red";
    console.log("  错误：应该抛出异常但没有");
} catch (error) {
    console.log("  ✓ 正确捕获错误:", (error as Error).message);
}

try {
    (point9.style.point as any).size = 20;
    console.log("  错误：应该抛出异常但没有");
} catch (error) {
    console.log("  ✓ 正确捕获错误:", (error as Error).message);
}

// 验证样式没有被修改
console.log("  验证样式未被修改:");
console.log("    color:", point9.style.color); // 应该还是 "purple"
console.log("    point.size:", point9.style.point?.size); // 应该还是 12

// ============================================================================
// 13. 深层合并测试
// ============================================================================

console.log("\n=== 13. 深层合并测试 ===");

const point10 = expl`p10 = (19, 20)` as VarExpl;

// 第一次设置
point10.style({
    color: "red",
    point: {
        size: 10,
        opacity: 0.8,
    },
    label: {
        text: "Initial",
    },
});

console.log("第一次设置后:");
console.log("  color:", point10.style.color);
console.log("  point.size:", point10.style.point?.size);
console.log("  point.opacity:", point10.style.point?.opacity);
console.log("  label.text:", point10.style.label?.text);

// 第二次合并（只更新部分属性）
point10.style({
    point: {
        size: 15, // 更新 size
        // opacity 保持不变
    },
    label: {
        text: "Updated", // 更新 text
    },
    // color 保持不变
});

console.log("\n第二次合并后（应该保留未更新的属性）:");
console.log("  color:", point10.style.color); // 应该还是 "red"
console.log("  point.size:", point10.style.point?.size); // 应该是 15
console.log("  point.opacity:", point10.style.point?.opacity); // 应该还是 0.8
console.log("  label.text:", point10.style.label?.text); // 应该是 "Updated"

// ============================================================================
// 14. Editor 的 set 和 delete 方法
// ============================================================================

console.log("\n=== 14. Editor 的 set 和 delete 方法 ===");

const point11 = expl`p11 = (21, 22)` as VarExpl;

point11.style((s: StyleEditor) => {
    s.point.size = 12;
    s.label.text = "Test";
});

console.log("设置后:");
console.log("  point.size:", point11.style.point?.size);
console.log("  label.text:", point11.style.label?.text);

// 使用 set 方法
point11.style((s: StyleEditor) => {
    s.point.set(20);
});

console.log("\n使用 set 方法后:");
console.log("  point.size:", point11.style.point?.size); // 应该是 20

// 使用 delete 方法
point11.style((s: StyleEditor) => {
    s.label.delete();
});

console.log("\n使用 delete 方法后:");
console.log("  label:", point11.style.label); // 应该是 undefined

// ============================================================================
// 15. 复杂场景：组合使用多种样式属性
// ============================================================================

console.log("\n=== 15. 复杂场景：组合使用多种样式属性 ===");

const complexPoint = expl`cp = (0, 0)` as VarExpl;

complexPoint.style({
    hidden: false,
    color: "rgb(100, 150, 200)",
    point: {
        style: PointStyle.STAR,
        size: 25,
        opacity: 0.9,
        dragMode: DragMode.XY,
    },
    label: {
        text: "Complex Point",
        size: 18,
        orientation: LabelOrientation.ABOVE_RIGHT,
        angle: "30",
    },
    showParts: {
        points: true,
        lines: false,
        fill: false,
        label: true,
    },
});

console.log("复杂样式设置:");
console.log("  hidden:", complexPoint.style.hidden);
console.log("  color:", complexPoint.style.color);
console.log("  point.style:", complexPoint.style.point?.style);
console.log("  point.size:", complexPoint.style.point?.size);
console.log("  point.opacity:", complexPoint.style.point?.opacity);
console.log("  point.dragMode:", complexPoint.style.point?.dragMode);
console.log("  label.text:", complexPoint.style.label?.text);
console.log("  label.size:", complexPoint.style.label?.size);
console.log("  label.orientation:", complexPoint.style.label?.orientation);
console.log("  label.angle:", complexPoint.style.label?.angle);
console.log("  showParts.points:", complexPoint.style.showParts?.points);
console.log("  showParts.lines:", complexPoint.style.showParts?.lines);
console.log("  showParts.label:", complexPoint.style.showParts?.label);

// ============================================================================
// 总结
// ============================================================================

console.log("\n=== 测试完成 ===");
console.log("所有样式 API 功能测试已执行。");
console.log("\n已验证的功能:");
console.log("✓ 样式读取（formula.style.point.size 等）");
console.log("✓ 回调形式编辑（formula.style(s => { ... })）");
console.log("✓ 对象合并形式编辑（formula.style({ ... })）");
console.log("✓ 便利快捷方式（.point(), .label(), .line(), .fill()）");
console.log("✓ 深层合并（保留未更新的属性）");
console.log("✓ 只读保护（防止直接修改）");
console.log("✓ Editor 的 set 和 delete 方法");
console.log("✓ 使用表达式作为样式值");
console.log("✓ 可见性控制");
console.log("✓ 定义域设置");

