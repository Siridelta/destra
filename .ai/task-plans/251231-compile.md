# 251231-compile

> **开始日期**: 2025年12月31日
> **目标**: 实现 Destra "默认模式" 的图表编译与导出系统。包括基于 Chevrotain 的全功能解析器、AST 转换、Formula 类型推断、ID 决议（接口定义）以及最终的 JSON 导出。这将替代原计划 [251107-more on core](./251107-more%20on%20core.md) 中的 Step 2.8。

## 核心思路

采用 "Fail Fast, Compile Late" 策略。
在 `Formula` 创建阶段即进行全量语法解析 (Parsing)，确立公式类型和依赖关系。
在导出阶段 (Export) 进行 ID 决议和最终 LaTeX 生成。

解析器选用 **Chevrotain**，并在 `destra.js/variant-drafts/v-id-mutable/src/core/expr-dsl-new` 目录下进行全新实现，随后替换原有逻辑。

## Phase 1: 基础设施准备与清理

**目标**: 建立新的源码目录，清理过时的 Tier 1 代码，准备基础数据结构。

### Step 1.1: 目录结构与依赖
- [ ] 确保 `chevrotain` 依赖已安装。
- [ ] 确认 `src/core/expr-dsl-new` 目录结构就绪。
- [ ] 在 `src/core/formula/base.ts` 中更新 `FormulaType` 枚举，移除过时的类型，添加 `Regression` 相关的类型支持。
- [ ] 更新 `Regression` 类定义（或新建子类），使其能够存储 `parameters: Expl[]` 信息。

### Step 1.2: AST 类型定义
- [ ] 在 `expr-dsl-new/parse-ast/ast-types.ts` (新建) 中定义 Destra 内部 AST 接口。
    - 需包含 `Literal`, `Identifier`, `Placeholder`, `Binary`, `Call`, `Context`, `Definition`, `Regression` 等节点类型。

## Phase 2: 解析器实现 (Chevrotain)

**目标**: 实现 `Lexer`, `Parser` 和 `Visitor`，支持文档 [Desmos 语法 & Expr DSL 语法参考] 中的所有核心语法。

### Step 2.1: Lexer 实现
- [ ] 在 `expr-dsl-new/parse-ast/lexer.ts` 中定义 Tokens。
    - 实现 `Placeholder` token (`§_PH_\d+_§`) 用于插值。
    - 实现所有关键字、运算符、括号等 Token。
    - 注意 Token 定义顺序 (Keywords > Identifiers)。

### Step 2.2: Parser (CST) 实现
- [ ] 在 `expr-dsl-new/parse-ast/parser.ts` 中实现 `DestraParser` 类。
    - 实现分层优先级规则 (Context > Additive > Multiplicative ...)。
    - 实现 `Formula` 顶层规则 (Definition | Regression | Equation | Expression)。
    - 实现 Context Statements (`For`, `With`, `Sum`, `Prod`, `Int`, `Diff`)。
    - 实现 List, Range, Piecewise 等结构。

### Step 2.3: Visitor (AST Construction) 实现
- [ ] 在 `expr-dsl-new/parse-ast/visitor.ts` 中实现 CST 到 AST 的转换逻辑。
    - 处理插值还原：根据 `Placeholder` 的索引从 `values` 数组中获取对象。
    - 处理 `dx` 在积分中的位置归一化。

### Step 2.4: 类型分析与后处理
- [ ] 在 `expr-dsl-new/analyzeType.ts` 中重写 `analyzeType` (或重命名为 `analyzeFormula`)。
    - 调用 Parser -> CST -> Visitor -> AST。
    - **FormulaType 推断**: 根据 AST 根节点类型判断 (Def, Reg, Eq, Expr)。
    - **隐式显式方程识别**: 若为 Expr 类型且仅依赖 x (2D)，标记为需要补全 `y=`。
    - **Regression 参数提取**: 遍历 AST 提取未知标识符作为回归参数。

## Phase 3: 集成与替换

**目标**: 将新解析器集成到核心工厂函数中。

### Step 3.1: 工厂函数更新
- [ ] 修改 `src/core/factories.ts` 中的 `expr` 和 `expl`。
    - 移除旧的 `analyzeType` 调用。
    - 接入新的解析流程。
    - 处理 Regression 参数的自动创建 (创建 `Expl` 并挂载)。

### Step 3.2: 移除旧代码
- [ ] 删除 `src/core/expr-dsl` (旧目录)。
- [ ] 确保所有测试/Playground 指向新逻辑。

## Phase 4: 编译与导出

**目标**: 实现 `Graph` 类和最终的 JSON 生成。

### Step 4.1: Graph 与 Folder 类
- [ ] 在 `src/core/graph.ts` (新建) 中实现 `Graph` 和 `Folder` 类。
    - 定义输入接口 (Root items, settings)。

### Step 4.2: 编译流程 - ID 决议 (骨架)
- [ ] 实现 ID 收集与冲突检查基础逻辑。
    - *注：复杂的重命名算法由另一任务并行处理，此处预留接口或实现基础版本（如简单的递增后缀）。*
    - 遍历 Graph 根节点，收集所有 Formula。
    - 检查 ID 冲突。

### Step 4.3: 编译流程 - LaTeX 生成
- [ ] 实现 AST 到 LaTeX 的代码生成器 (`ast-to-latex.ts`)。
    - 递归遍历 AST 生成字符串。
    - 将 `Placeholder` (Destra 对象引用) 转换为其 ID (或 Realname)。

### Step 4.4: 导出实现
- [ ] 实现 `Graph.prototype.export()`。
    - 组装 JSON 结构：`{ version: 9, randomSeed, graph, expressions: [...] }`。
    - 处理 Style 属性到 Desmos 属性的映射。
    - 处理 Slider 属性。

## Phase 5: 验证

### Step 5.1: 功能测试
- [ ] 编写测试用例验证各类语法的解析与导出。
    - 基础算术
    - 列表与范围
    - 函数定义与调用
    - 上下文语句 (Sum, For)
    - 回归 (检查参数提取)
    - 显式方程自动补全

