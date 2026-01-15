/**
 * Destra 核心模块主入口
 *
 * 本文件作为 @destra/core 包的统一出口，导入所有功能模块并重新导出公共 API。
 *
 * 注意：某些模块的导入具有副作用（原型注入），这些导入必须被执行以确保功能正常工作。
 * 并且需要留意顺序。各文件内只能导入我们在这里设计的顺序里已被导入的模块，以免破坏原型注入的顺序。
 */

// ============================================================================
// 核心类型和基类，以及状态管理模块
// ============================================================================

import {
    Formula,
    Expression, ExplicitEquation, ImplicitEquation, Regression,
    VarExpl, type FuncExpl, Expl,
    type CtxVar, type CtxExpression, type CtxVarExpl, type CtxFuncExpl, type CtxExpBody, type CtxExp,
    type Image
} from "./formula/base";

import { type FormulaType, type Substitutable, type ImageOptions } from "./formula/types";

export {
    type Formula, FormulaType,
    type Expression, type ExplicitEquation, type ImplicitEquation, type Regression,
    type VarExpl, type FuncExpl, type Expl,
    type Substitutable,
    type CtxVar, type CtxExpression, type CtxVarExpl, type CtxFuncExpl, type CtxExpBody, type CtxExp,
    type Image
};

import "./state";

// ============================================================================
// 导入模块以应用原型注入（重要：这些导入有副作用）
// ============================================================================

// ID 相关方法的原型注入
import "./formula/id";
// Realname 相关方法的原型注入
import "./formula/realname";

// Label 相关功能
import { Label, label } from "./formula/label";
export { type Label, label };

// 样式相关方法的原型注入，并导出样式相关类型
import {
    LineStyle, PointStyle, DragMode, LabelOrientation, LoopMode,
    type NumericStyleValue, type ColorStyleValue, type LabelTextValue,
    type DestraStyle,
    type EditorBase, type LeafEditor,
    type ShowPartsEditor, type LineEditor, type PointEditor, type FillEditor,
    type LabelEditor, type DomainEditor, type RootStyleEditor,
    type SliderEditor,
} from "./formula/style";
import './formula/style';

export {
    LineStyle, PointStyle, DragMode, LabelOrientation, LoopMode,
    NumericStyleValue, ColorStyleValue, LabelTextValue,
    DestraStyle,
    EditorBase, LeafEditor,
    ShowPartsEditor, SliderEditor, LineEditor, PointEditor, FillEditor,
    LabelEditor, DomainEditor, RootStyleEditor,
};


// ============================================================================
// 导出工厂函数和 API
// ============================================================================

import {
    expr, expl, For, With, Sum, Int, Prod, Diff, Func,
    regr,
} from "./factories";
export { expr, expl, For, With, Sum, Int, Prod, Diff, Func, regr };

export * from "./selection";
export * from "./builder";
export * from "./compile";

// ============================================================================
// 导出解析器相关（可选，供高级用户使用）
// ============================================================================

// export * from "./expr-dsl/analyzeType";

