# 251107-more on core

> **开始日期**: 2025年11月7日
> **目标**: 将 `destra.js/variant-drafts/v-id-mutable/src/core/index.ts` 中初步实现的核心表达式原型，重构为一个高度模块化、可扩展、可维护的新结构。为 ID 体系、样式 API、`selection` 和 `builder` 等核心功能的实现奠定工程化基础。

## 核心思路

当前 `core/index.ts` 文件承载了所有的核心定义，随着功能增加将变得难以维护。

我们将采用 **声明合并 (Declaration Merging)** 与 **原型注入 (Prototype Injection)** 的 TypeScript 高级特性，将 `Formula` 类的不同功能逻辑（如 ID 操作、样式操作）拆分到独立的文件中，同时保持类型系统的完整性和运行时的一致性。

同时，基于 [DSL 解析策略](./../技术笔记/JS路线/默认模式/DSL%20解析策略.md)，我们再次明确将解析逻辑拆分为 Tier 1 (类型分析) 和 Tier 2 (AST 解析)，并分别应用在运行时和开发时。（事实上这种区分在上一个计划 [251026-core prototype](./251026-core%20prototype.md) 里已经初步提出了）

## Step 1: 文件结构重构

**状态**: 已完成

首先，需要将 `src/core/` 目录从单一文件结构调整为职责更清晰的模块化结构。

**调整后结构:**

```plaintext
destra.js/variant-drafts/v-id-mutable/src/
└── core/
    ├── formula/
    │   ├── base.ts         # 定义 Formula, Expl, Expr 等基类和核心类型
    │   ├── id.ts           # 实现 ID 相关方法 (原型注入)
    │   └── style.ts        # 实现样式相关方法 (原型注入)
    │
    ├── parser/
    │   ├── analyzeType.ts  # Tier 1: 基于正则的类型分析
    │   └── astParser.ts    # Tier 2: 完整的 AST 解析器 (暂缓实现)
    │
    ├── factories.ts        # 实现 expr, expl 等核心工厂函数
    ├── selection.ts        # 实现 selection() 函数
    ├── builder.ts          # 实现 builder() API
    │
    └── index.ts            # 主入口文件，导入所有模块并统一导出
```

为了留档参考，原有 `core/index.ts` 文件需要移动并重命名为 `core/index.legacy.ts`，在全部完工之后再删除。

同时，需要先完成 `core/index.ts` 文件的实现，它的职责将变得更加纯粹：导入所有功能模块（以触发原型注入），并重新导出所有公共 API，形成 `@destra/core` 包的统一出口。在其他功能分支完成之前，可以先为它们实现一个简单的占位文件。

**示例 (`core/index.ts`)**:
```typescript
// 导出核心类型和基类
export * from "./formula/base";

// 导入模块以应用原型注入 (重要：这些导入有副作用)
import "./formula/id";
import "./formula/style";

// 导出工厂函数和 API
export * from "./factories";
export * from "./selection";
export * from "./builder";
```


## Step 2: 功能实现分支

在新的文件结构基础上，并行实现以下核心功能。

### Step 2.1: 核心创建逻辑拆分

**负责人**: AI Coder
**状态**: 已完成
**前置文档**: `DSL 解析策略.md`

**任务**:
1.  **`formula/base.ts`**: 将原 `index.ts` 中的所有核心**类型定义** (`TemplatePayload`, `FormulaType` 等) 和**基类** (`Formula`, `Expl`, `Expr`) 及**实现类** (`Expression`, `VarExpl` 等) 迁移至此。
2.  **`parser/analyzeType.ts`**: 将原 `index.ts` 中用于**类型分析 (Tier 1)** 的逻辑迁移至此，包括所有正则表达式定义和 `analyzeType` 函数。`parser/astParser.ts` 暂缓实现。
3.  **`factories.ts`**: 将 `expr` 和 `expl` 两个**工厂函数**迁移至此，并调整其内部实现，使其从 `formula/base.ts` 和 `parser/analyzeType.ts` 导入依赖。

### Step 2.2: `formula` 模块 - ID 逻辑实现

**负责人**: AI Coder
**状态**: 部分完成，等待 step 2.4 明确更多批量操作方法的需求
**前置文档**: `核心API与命名机制.md`

**任务**:
1.  在 `formula/id.ts` 中，使用“声明合并+原型注入”模式为 `Expl` 类实现 `.id()` 方法和 `.realname()` 方法。
2.  为 `Formula` 实现 `.idPrepend()` 等批量操作方法。

**

**实现模式示例 (`formula/id.ts`)**:
```typescript
import { Expl } from "./base";

// 1. 声明合并：扩展类型定义
declare module "./base" {
    interface Expl {
        id(value: string, isImplicit?: boolean): this;
        idPrepend(segment: string): this;
    }
}

// 2. 原型注入：提供运行时实现
Expl.prototype.id = function(value, isImplicit = false) {
    // ... 实现逻辑 ...
    this.idMeta.value = value;
    this.idMeta.isImplicit = isImplicit;
    return this;
};

Expl.prototype.idPrepend = function(segment) {
    const currentId = this.idMeta.value ?? "";
    this.idMeta.value = `${segment}.${currentId}`;
    return this;
};
```

### Step 2.3-pre: 调查 Desmos 样式属性详细信息

**负责人**: static, Gemini
**状态**: 已完成
**前置文档**: `属性与样式API.md`

**任务**:
调查清楚 Desmos 里具体有哪些样式属性，以及它们的用途、设置方式、获取方式、修改方式等详细信息，并记录成文档；并确定我们 Destra 这边的样式 API 结构设计（显然 Desmos 原版的 API 不够直观(intuitive)，我们需要抓住这次机会重构它）。
**产出**: 
- `.ai/Desmos建模/ExpressionState定义.md`
- `.ai/技术笔记/JS路线/默认模式/样式API结构.md`

### Step 2.3: `formula` 模块 - 样式属性 API
**负责人**: AI Coder
**状态**: 已完成
**前置文档**: 
- `属性与样式API.md`
- `样式API结构.md`

**任务**:
1.  在 `formula/style.ts` 中，遵循与 ID 逻辑相同的“声明合并+原型注入”模式，为 `Formula` 类实现 `.style()` 方法。
2.  根据 `属性与样式API.md` 中关于“可变显示属性”的设计，以及 `样式API结构.md` 中定义的详细数据模型，实现 `Editor` 模式及相关类型。

### Step 2.3-post: 样式辅助功能补全 (Factories & Label)
**负责人**: AI Coder
**状态**: 已完成
**前置文档**: 无

**任务**:
1.  **Label 类与工厂**: 
    *   在 `formula/base.ts` 中增加 `Label` 类定义 (继承自 `Formula`)。
    *   在 `factories.ts` 中实现 `label` 模版标签函数。
    *   更新 `formula/style.ts` 中的 `DestraStyle` 定义，使 `label.text` 支持 `Label` 类型。
2.  **样式 Enum 导出**:
    *   确保 `core/index.ts` 导出了 `LineStyle`, `PointStyle` 等枚举。

### Step 2.4: 统一状态管理重构 (FormulaState)
**负责人**: AI Coder
**状态**: 已完成
**前置文档**: 无

**任务**:
1.  **创建 `core/state.ts`**: 实现统一的 `FormulaState` 接口和基于 `WeakMap` 的全局状态存储。
    ```typescript
    export interface FormulaState { }
    // 使用 interface merging 允许 id.ts, style.ts 等模块扩展它
    
    const states = new WeakMap<Object, FormulaState>();
    export const getState = (obj: Object) => { ... }
    ```
2.  **重构 `core/formula/id.ts`**:
    *   使用 `declare module "../state"` 扩展 `FormulaState` 接口。
    *   通过 `getState(this).idData` 访问和存储 ID 数据。
3.  **重构 `core/formula/style.ts`**:
    *   移除原本独立的 WeakMap。
    *   使用 `declare module "../state"` 扩展 `FormulaState` 接口。
    *   通过 `getState(this).styleData` 访问和存储样式数据。
4.  **更新 `core/formula/base.ts`**:
    *   更新 `_content` getter 或其他可能访问内部状态的地方，使其适配新的 `getState` 模式（或者保持通过公开 API 访问）。

### Step 2.5: 上下文语句工厂 (Scope & Function)
**负责人**: AI Coder
**状态**: 已完成
**前置文档**: `简化的计算模型.md`

**任务**:
1.  **CtxVar 类**: 实现上下文变量类，同时修改其他代码以和 CtxVar 兼容。
2.  **analyzeCtxVarDefinition**: 实现分析上下文变量定义的函数，用于创建 CtxVar 对象。
    *   **实现思路**: 从分隔了各个变量定义的逗号入手。由于 DSL 语法的复杂性（如列表 `[1, 2]` 或函数调用 `f(a, b)`），不能简单地检测所有逗号并分割。必须复用 `iterativeCheckBrackets` 函数（基于括号平衡）来识别处于顶层（括号层级之外）的逗号，将其作为真正的变量定义分隔符。然后对分割后的每个片段，复用 `buildInspectableSource` 生成可检查的字符串，并应用正则提取变量名。建议将 `analyzeType.ts` 中的辅助函数（如 `buildInspectableSource`, `iterativeCheckBrackets`）抽离到 `core/expr-dsl/utils.ts` 以便复用。
3.  **For / Sum / Int 工厂**: 实现列表推导、求和、积分的上下文工厂。
4.  **With 工厂**: 实现局部变量绑定工厂，并包含嵌套限制检查。
5.  **expl 语法糖**: 实现 `expl.For` 和 `expl.With`。
6.  **Func 工厂**: 实现函数定义的工厂函数，包含基于正则的参数列表解析。

### Step 2.6: `selection` 模块实现

**负责人**: AI Coder
**状态**: 已完成
**前置文档**: `核心API与命名机制.md`

**任务**:
1.  创建 `core/selection.ts` 文件。
2.  实现 `selection()` 工厂函数，该函数接收一个包含 `Formula` 对象的普通 JavaScript 对象，并返回一个“选区”实例。
3.  为“选区”实例实现 `.idPrepend()` 等批量操作方法。这些方法需要**可变地 (mutably)** 修改选区内所有 `Formula` 对象的 ID。

### Step 2.7: `builder` API 实现

**负责人**: AI Coder
**状态**: 已完成
**前置文档**: `核心API与命名机制.md`

**任务**:
1.  创建 `core/builder.ts` 文件。
2.  根据文档，实现 `builder()` API，其核心是正确处理和传递 `idDrvs` (ID derivation) 函数，以确保动态生成的表达式能正确应用外部的 ID 变换。

### Step 2.8: 图表编译与状态导出

**负责人**: static, Gemini
**状态**: **待讨论 / 待计划**

**任务**:
1.  **创建新设计文档**: 在 `.ai/技术笔记/JS路线/默认模式/` 目录下新建 `图表编译与状态导出.md`。
2.  **明确设计要点**: 在新文档中，我们需要共同讨论并定义以下内容：
    *   **API 入口**: 导出功能的顶层 API 是什么？例如 `destra.export({ ... })`。
    *   **输入**: API 接收什么作为输入？一个 `selection` 对象还是 `Formula` 数组？
    *   **核心逻辑**:
        *   依赖图构建 (DAG)。
        *   ID 唯一性校验。
        *   基于 `isImplicit` 元数据的 Desmos Name 冲突解决策略。
        *   将 `Formula` 引用转换为 Desmos Name 字符串。
    *   **输出格式**: 最终 Desmos State JSON 的详细结构。
