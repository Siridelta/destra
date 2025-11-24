/**
 * Destra 核心模块主入口
 *
 * 本文件作为 @destra/core 包的统一出口，导入所有功能模块并重新导出公共 API。
 *
 * 注意：某些模块的导入具有副作用（原型注入），这些导入必须被执行以确保功能正常工作。
 */

// ============================================================================
// 核心类型和基类，以及状态管理模块
// ============================================================================

import { 
    Formula,
    Expression, ExplicitEquation, ImplicitEquation, Regression, 
    VarExpl, type FuncExpl, Expl,
    type Substitutable
} from "./formula/base";

import "./state";

// ============================================================================
// 导入模块以应用原型注入（重要：这些导入有副作用）
// ============================================================================

// ID 相关方法的原型注入
import "./formula/id";

// 样式相关方法的原型注入，并导出样式相关类型
export * from "./formula/style";

// Label 相关功能
export * from "./formula/label";

export { 
    Formula,
    Expression, ExplicitEquation, ImplicitEquation, Regression, 
    VarExpl, type FuncExpl, Expl, 
    type Substitutable 
};
// ============================================================================
// 导出工厂函数和 API
// ============================================================================

export * from "./factories";
// export * from "./selection";
// export * from "./builder";

// ============================================================================
// 导出解析器相关（可选，供高级用户使用）
// ============================================================================

export * from "./expr-dsl/analyzeType";

