
### **重构 `destra.js/shared/core/src/index.ts` 方案**

**目标：** 将当前基于接口和工厂函数的 `expr`/`expl` 实现，重构为一个健壮的、面向对象的、类型安全的三层类继承体系。该体系将能区分不同公式类型，提供专用 API，并在编译时和运行时防止误用。

---

#### **1. 设计三层类继承体系**

**第一层 (基类): `Formula`**
*   **类型**: `abstract class`
*   **职责**: 代表 Desmos 中的任意一行公式，是所有表达式类的最终基类。
*   **包含**:
    *   `readonly template: TemplatePayload`: 存储原始模板字符串数据。
    *   `readonly dependencies: readonly EmbeddableExpr[]`: 存储所有非终端类型的依赖项。
    *   `readonly isEmbeddable: boolean`: 一个抽象属性，用于在运行时检查该类型是否为“终端类型”。
    *   **通用 API**: 应包含通用的 `style()` 方法，用于设置样式。
    *   **构造函数**: 在构造函数中执行**运行时检查**，遍历所有 `dependencies`，如果依赖项的 `isEmbeddable` 属性为 `false`，则抛出 `TypeError`。

**第二层 (中间抽象类): `Expl` 和 `Expr`**

1.  **`Expl extends Formula`**
    *   **类型**: `abstract class`
    *   **职责**: 代表所有“声明式”的、会引入新符号的公式（如变量、函数）。
    *   **包含**:
        *   `readonly idMeta: IdMetadata`: 存储 ID 状态。
        *   **ID API**: 包含 `.id(value: string)` 方法，用于设置 ID。

2.  **`Expr extends Formula`**
    *   **类型**: `abstract class`
    *   **职责**: 代表所有匿名的、“结构性”的公式（如纯表达式、方程）。

**第三层 (具体实现类)**

*   **继承自 `Expl`**:
    *   `VarExpl`: 变量定义 (`a=3`)。`isEmbeddable` 应为 `true`。包含 `readonly name: string` 属性。
    *   `FuncExpl<T_Sig extends (...args: any[]) => any>`: 函数定义，这是一个**泛型类**。`isEmbeddable` 应为 `true`。
        *   **包含**: `readonly name: string` 和 `readonly params: string[]` 属性。
        *   **独特 API**: `expl` 工厂函数将返回一个**可直接调用**的函数对象，其类型为 `FuncExpl<T_Sig> & T_Sig`。调用它会返回一个代表函数调用的 `Expression` 对象。用户可以这样使用：
        ```typescript
        const f = expl`(x, y) => x^2 + y^2`;
        // 预处理器会转换为这样的标准形式：
        // const f = (expl`(x, y) => x^2 + y^2` as FuncExpl<(x: Substitutable, y: Substitutable) => Expression>).id("f");
        const result = f(1, 2); // result 为 Expression 对象，内容为 “f(1, 2)”；用户可以通过 IDE 提示看到 f 的参数名称为 第一个为x 和 第二个为y
        ```
        *   **类型安全**: 其参数类型安全由预处理器/语言服务在后台生成 `as FuncExpl<...>` 类型断言来保障。

*   **继承自 `Expr`**:
    *   `Expression`: 纯表达式 (`a+b`)。`isEmbeddable` 应为 `true`。
    *   `ImplicitEquation`: 隐式方程/不等式 (`y>x`)。`isEmbeddable` 应为 `false` (终端类型)。
    *   `ExplicitEquation`: 显式方程 (`y=sin(x)`)。`isEmbeddable` 应为 `false` (终端类型)。
    *   `Regression`: 回归 (`y_1~mx_1+b`)。`isEmbeddable` 应为 `false` (终端类型)。

---

#### **2. 建立类型系统 (用于编译时安全)**

定义一组联合类型，用于在函数签名中提供静态类型检查。

```typescript

// 可被嵌入/可被依赖的表达式类型
type Substitutable = Expression | VarExpl | FuncExpl<any>;
```

---

#### **3. 实现智能工厂函数**

重构 `expr` 和 `expl` 为“智能工厂”，它们负责解析输入并返回正确的类实例。

1.  **`expl` 工厂**:
    *   **签名**: `expl(...): Expl`
    *   **逻辑**:
        1.  调用 `analyzeType` 函数分析模板字符串。
        2.  如果结果是“表达式”（即变量定义），则 `new VarExpl(...)` 并返回。
        3.  如果结果是“函数定义”，则创建一个可调用的函数，将 `new FuncExpl(...)` 的实例属性附加其上，并返回这个交叉类型的可调用对象。
        4.  如果结果是任何其他类型，**必须抛出一个 `TypeError`**。

2.  **`expr` 工厂**:
    *   **签名**: `expr(...): Expr`
    *   **逻辑**:
        1.  调用 `analyzeType` 函数分析模板字符串。
        2.  如果结果能对应`Expr`派生的某种类型（Expression、ImplicitEquation、ExplicitEquation、Regression），且没有名字，则创建一个实例并返回。
        3.  否则（如函数定义），**必须抛出一个 `TypeError`**。

---

#### **4. 实现解析器与分类器 (Parser & Classifier)**

将解析逻辑拆分为两个独立的函数，以适应不同场景的需求，特别是为性能敏感的 IDE 工具链优化。

1.  **`analyzeType(template: TemplatePayload): FormulaTypeInfo` (轻量级分类器)**
    *   **职责**: 在对象创建时，对模板字符串进行**一次**轻量级扫描，提取所有必要的签名信息。也供预处理器使用，预处理器会对代码进行扫描，用这个方法分析出对象的类型，然后在后方生成类型断言作为标注，确保类型安全。
    *   **逻辑**: 使用正则表达式，一次性提取出 `FormulaTypeInfo`、变量名、函数名、参数列表等。
    *   **返回值**: 返回一个可辨识联合类型 `FormulaTypeInfo`，其中包含所有解析出的类型信息。
    ```typescript
    enum FormulaType {
        Function = 'function',
        Expression = 'expression',     // 兼容纯表达式（Expression）和变量定义（VarExpl），因为它们在 Desmos 中都被视为表达式。
        Equation = 'equation',
        Inequality = 'inequality',
        Regression = 'regression',
    }
    type FormulaTypeInfo = {
        type: Exclude<FormulaType, FormulaType.Expression | FormulaType.Function>;
    } | {
        type: FormulaType.Expression;
        name?: string;
    } | {
        type: FormulaType.Function;
        name?: string;
        params: string[];
    };
    ```
    像 `` expl`a = 3` `` 这样的模板字符串，返回的 `FormulaTypeInfo` 为 { type: FormulaType.Expression, name: 'a' }；
    像 `` expr`${a}+${b}` `` 这样的模板字符串，返回的 `FormulaTypeInfo` 为 { type: FormulaType.Expression}；
    像 `` expl`f(x) = x^2` `` 这样的模板字符串，返回的 `FormulaTypeInfo` 为 { type: FormulaType.Function, name: 'f', params: ['x'] }；
    像 `` expr`(x, y) => x^2 + y^2` `` 这样的模板字符串，返回的 `FormulaTypeInfo` 为 { type: FormulaType.Function, params: ['x', 'y'] }；

2.  **`parse(formula: Formula): ParsedData` (表达式体序列化器)**
    *   **职责**: 在最终导出 Desmos State 时被调用，负责解读全部 Expr DSL 的表达式体。
    *   **逻辑**: 遍历公式的依赖图，将 `EmbeddableExpr` 依赖替换为它们的最终 ID，拼接完整的表达式字符串。
    *   **返回值**: 返回一个 Desmos State JSON 中代表该行公式的 JSON 对象片段。



**初期实现**: 两个函数都可以先作为桩(stub)函数实现，`analyzeType` 返回一个默认类型，`parse` 返回一个空的 `info` 对象，以便于先将整体架构搭建起来。
