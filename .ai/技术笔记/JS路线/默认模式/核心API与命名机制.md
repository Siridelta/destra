# 核心API与命名机制

> 本文档详细阐述 Destra “默认模式”的核心 API 与命名机制。这是默认模式工程化能力的基础，旨在解决 JavaScript 的灵活性与 Desmos 符号系统的严格性之间的矛盾，并提供强大的模块化与代码复用能力。

## 1. 核心问题与设计目标

设计的起点源于一个核心矛盾：
> JavaScript 变量名的丰富性、灵活性与 Desmos 变量名的严格限制、可读性差之间的冲突。

在此之上，还有一个关键的工程化需求：
> 如何让用户能够像使用 npm 包一样，模块化地分发、组合和复用 Destra 代码，同时避免命名冲突并提供良好的开发者体验（DevEx）。

## 2. 三层命名系统

为了解决上述问题，我们引入了一个解耦的、分工明确的三层命名系统：

1.  **JS 变量名 (JS Variable Name)**
    -   **角色**: 临时的、上下文相关的别名。
    -   **描述**: 这是开发者在代码中直接使用的名字，如 `const myVector = expl(...)`。它的主要作用是服务于代码的编写和组织，但由于它在模块导入时可以被任意重命名，因此本身是不稳定的，不能作为公式的唯一身份标识。

2.  **Destra 标识 (Destra ID)**
    -   **角色**: **主键 (Primary Key)**，`string` 类型，全局唯一。
    -   **描述**: 这是公式在 Destra 框架内部的**真正身份**。它独立于 JS 变量名，由库作者定义，确保了无论公式在何处被引用、如何被重命名，其内在身份始终不变。ID 的全局唯一性是解决模块化冲突的基石。但是为了让代码简单，我们让创作形式里可以不用指定ID，而在预处理转换时会根据 JS 变量名自动生成一个默认 ID。

3.  **Desmos 真名 (Desmos Name)**
    -   **角色**: 最终产物。
    -   **描述**: 这是最终生成到 Desmos 图表中的、符合其命名规则的符号名。它由 Destra 编译器根据 Destra ID **自动生成**，默认保证人类可读（例如 `myLib.vec` -> `m_yLib_vec`），并能自动解决冲突（例如添加数字后缀 `v_1`, `v_2`）。
    -   **命名冲突解决优先级**: 为了保证最终生成变量名的可读性和可预测性，编译器在解决命名冲突时，会赋予**隐式ID**（由预处理器根据JS变量名自动生成）**较低的优先级**。这意味着，当两个不同的 Destra ID 希望生成同一个 Desmos 真名时，拥有显式ID（由库作者通过 `.id()` 等方式构建）的表达式将更有可能获得它想要的更可读的名字。

## 3. 核心 API 与工作流

经过多个版本的方案演进，我们最终确立了一套拥抱**ID 可变性**与**工具链增强**的 API，同时选择倡导开发者不将 ID 体系与物理文件结构耦合，而是主动维护一个稳定的、与物理文件结构**异构**的逻辑 ID 体系，从而保证库的 API 稳定性和下游使用体验。

### 3.1 两类表达式的创建与 ID 赋予

重新说明我们的双类型模式：
-   ``expl`...` ``: 用于创建一个**具名声明 (Explicit Declaration)**，须带有 Destra ID，或最终在导出之前被赋予 Destra ID。这是构成计算图的基本节点。
-   ``expr`...` ``: 用于创建一个可内联 (inline) 的**纯表达式片段 (Expression)**，它本身不被视为一个独立的声明，不会被赋予 Destra ID。

#### 双形式（创作形式 / 标准形式）设计方案

在原版的双形式方案上，为了实现“隐式ID”在命名冲突中具有较低优先级的特性，预处理器在转换时需要为 ID 附加一个元数据来标记其来源。这通过一个内部方法实现，该方法可以记录 ID 是否为隐式生成。

我们可以设想 `.id()` 方法的内部签名类似 `id(value: string, isImplicit: boolean = false)`。

**转换规则**

1.  **隐式 ID (创作形式)**: 当开发者编写最简洁的代码时：
    ```javascript
    // 创作形式
    const myVec = expl`(1, 2)`;
    ```
    预处理器会将其转换为“标准形式”，并明确标记该 ID 是**隐式的**：
    ```javascript
    // 标准形式
    const myVec = expl`(1, 2)`.id("myVec", true);
    ```

2.  **显式 ID**: 当开发者（尤其是库作者）为了稳定性和清晰性而手动指定 ID 时：
    ```javascript
    // 创作形式
    const gravity = expl`(0, -9.8)`.id("physics.gravity");
    ```
    预处理器会保持其原样。手动调用的 `.id()` 方法，其 `isImplicit` 参数会使用默认值 `false`，因此该 ID 被视为**显式的**。
    
    另外，创作形式下显式 ID 也有其他写法：
    ```javascript
    // 创作形式
    const gravity = expl`physics.gravity = (0, -9.8)`;
    const sigmoid = expl`sigmoid(x) = 1 / (1 + e^(-x))`;
    ```
    为了兼容其他方案设计、以及标准形式里支持的这种写法而设计。但是此方案的标准模式统一用 `.id()` 方法，所以它在转换后也会变成上面那样的 `.id()` 写法。
    ```javascript
    // 标准形式
    const gravity = expl`(0, -9.8)`.id("physics.gravity");
    const sigmoid = expl`(x) => 1 / (1 + e^(-x))`.id("sigmoid");
    ```

通过这种方式，ID 的优先级信息被完整地保留下来，供后续的编译步骤使用，从而实现了智能的、符合直觉的命名冲突解决方案。

**关于无 ID 的 `expl` 对象**

`expl` 对象**允许在创建时没有 ID**。这对于 `builder` 等动态生成场景是必需的，因为在这些场景下，表达式对象无法在创建时通过预处理器从 JS 变量名中获得隐式 ID。

因此，“无 ID 的 `expl`”是一种合法的中间状态。但在最终的图表编译阶段，**每一个 `expl` 对象都必须拥有一个全局唯一的 Destra ID**。开发者有责任在其代码逻辑中（例如在 `builder` 函数内部），为所有动态创建的 `expl` 对象通过 `.id()` 等方式显式赋予 ID。

### 3.2 构建逻辑 ID 树: `selection` 与 `.idPrepend()` 等 ID 批量操作 API

为了让库作者能构建一个与物理文件结构**异构**的、稳定的逻辑 ID 体系，我们提供了用于批量操作 ID 的 API。这种 API 的设计思路类似于一个“选区”：你先选中一组表达式，然后对这个选区进行批量操作，这些操作会同步地直接应用到选区内的所有表达式上。不过，你也可以在选区内部再嵌套选区。

**关键决策：拥抱可变 API (Mutable API)**

为了在进行批量 ID 操作时，维持表达式对象之间正确的依赖引用关系，ID 操作 API 被设计为**可变的 (Mutable)**。这意味着 `.idPrepend()` 等操作将**直接修改**传入的表达式对象本身，而不是返回新对象。

-   **`selection({ ... })`**: 一个核心辅助函数，其作用是创建一个包含一组表达式（或 `builder`）的“选区”(Selection) 对象，以便进行后续的批量 ID 操作。它允许嵌套，以构建层次化的逻辑 ID 命名空间。

-   **`.idPrepend(segment: string)`**: 一个可变 API，它接受一个 ID 段 (`segment`) 并将其作为前缀，添加到 单个表达式 或 `selection` 内所有对象的 ID 路径中。

**示例：库作者如何组织和导出模块**

```javascript
// file: my-lib/src/physics/core.js
import { expl, selection } from 'destra';

let initialPosition = expl`(0,0)`;
let velocity = expl`(10, 5)`;
let gravity = expl`(0, -9.8)`;

// 使用 selection 将相关表达式聚合为一个“选区”
const corePhysics = selection({
    initialPosition,
    velocity,
    gravity,
});

// 使用可变 API 为选区内所有表达式的 ID 添加前缀 "physics"
corePhysics.idPrepend('physics');

// 扁平导出，以获得最佳的 IDE 支持
export { 
    initialPosition: corePhysics.initialPosition, // some JSDoc here
    velocity: corePhysics.velocity, // some JSDoc here
    gravity: corePhysics.gravity, // some JSDoc here
};
```

当最终编译时，`initialPosition` 的 Destra ID 将是 `my-lib.physics.initialPosition`（假设库名为 `my-lib`），从而实现了与文件结构无关的、稳定的逻辑命名。

### 3.3 ID 路径分隔符约定

为了保持 API 的简洁性，所有 ID 段 (ID Segment) 均统一使用**点号 (`.`)** 作为分隔符。

这个方案向库开发者提出了一个额外的约定：我们**建议**库作者在发布 npm 包时**避免在包名中使用点号**，以便让 Destra ID 的顶级名称与 npm 包名能轻松保持一致。

### 3.4 动态生成: `builder`

为了支持参数化生成等高级动态场景，方案将“表达式构造器” (**expr builder**) 提升为一等公民。`builder()` API 用于创建一个 `builder`，它能够正确响应外部通过 `selection` 等方式施加的批量 ID 变换。

`builder` 的核心在于，它接收一个回调函数，该回调函数本身需要返回一个可被用户调用的、用于生成表达式的函数。为了让 `builder` 内部生成的表达式能正确应用外部的 ID 变换，外层回调会接收一个 `idDrvs` 函数 (`(initialId: string) => string`)。`builder` 的内部逻辑必须使用这个 `idDrvs` 函数来处理所有它生成的表达式的ID。

```javascript
// builder 的签名示意
builder(
    (idDrvs: (initialId: string) => string) =>
        (param1, param2, ...) => {
            // ... 内部逻辑 ...
            // 必须使用 idDrvs 来处理内部生成的表达式 ID
            const innerExpr = expl`...`.id(idDrvs("innerExpr"));
            return innerExpr;
        }
);

// 示例：创建一个生成一系列正多边形 explicit 变量（“desmos 变量阵列”）的 builder
const createPolygons = builder((idDrvs) => (count, sides) => {
    return Array.from({ length: count }, (_, i) => {
        return expl`polygon(
                -sin([1 ... ${sides}] / ${sides} * 2pi), 
                cos([1 ... ${sides}] / ${sides} * 2pi)
            )`
            .id(idDrvs(`polygon_${i + 1}`));
    });
});
```

### 3.5 高级 API

-   **`.realname(name: string)`**: 用于**覆盖** Destra 的自动命名生成器，强制指定表达式的最终 Desmos 真名。这是实现“键盘输入 Hack”等高级技巧所必需的。

-   **`.hoverInfo(callback)`**: 允许库作者为表达式或 `builder` 提供自定义函数，用于在 IDE 插件中生成动态的、内容丰富的悬停提示信息。这是对放弃静态类型编码 ID 的核心补偿机制，是保障开发者体验的关键。

    此 API 旨在弥补因采用可变 API 而导致静态类型系统无法追踪最终 ID 的问题。通过 IDE 插件（Volar）的配合，它能在用户将鼠标悬停到变量上时，动态地计算并展示其信息。如果通过实时计算原始表达式的方式计算 ID 开销过大，这个方式也允许库作者在绕过真实计算的情况下轻量地计算提供一个预览性的 ID 信息。

    -   **回调函数签名**: `callback: (info) => string`
    -   **`info` 对象**: 回调函数会接收一个 `info` 对象，其中包含计算提示信息所需的全部数据和工具：
        -   `id: string`: 表达式在当前状态下计算出的**最终 ID**。
        -   `realname?: string`: 通过 `.realname()` 强制指定的最终 Desmos 变量名。
        -   `idInitial: string`: 表达式未经任何批量 ID 操作修改前的**初始 ID**。
        -   `idDrvs: (initialId: string) => string`: 一个函数，封装了此对象经历过的**所有 ID 变换**。它可以将一个初始 ID 转换为最终 ID，库作者可以用它来向使用者展示 ID 的变换逻辑。
        -   `mkDefaultInfo: (options: {id: string, realname?: string, additionalInfo?: string}) => string`: 一个辅助函数，用于方便地生成默认格式的悬停提示字符串以方便风格统一，并支持在其后添加一段额外信息。
    
    **示例**:
    ```javascript
    import { expl, selection } from 'destra';

    let gravity = expl`(0, -9.8)`;
    
    gravity.hoverInfo((info) => {
        // 使用辅助函数生成标准格式，并附加额外说明
        return info.mkDefaultInfo({
            id: info.id,
            realname: info.realname,
            additionalInfo: "This represents the gravitational constant on Earth."
        });
    });

    const physics = selection({ gravity }).idPrepend("physics");
    
    export { gravity: physics.gravity };
    ```
    当库使用者悬停在导入的 `gravity` 变量上时，IDE 插件将执行此回调，并显示出包含其最终 ID (`physics.gravity`) 和自定义文档的提示。

### 3.6 设计探讨：`idDrvs` 的形态

`idDrvs` (ID derivations) 是框架向 `builder` 和 `.hoverInfo` 等 API 内部传递“ID 变换逻辑”的核心机制。在当前的设计中，它是一个函数 `(initialId: string) => string`。

-   **优点**: 这种形态极度简单直接，完美地封装了“一系列变换”这个概念，调用者只需传入初始值即可得到最终结果。
-   **待议**: 这种“黑盒”形态的缺点在于，我们无法从外部检查 (inspect) 函数内部到底包含了哪些具体的变换步骤。这限制了 IDE 插件等工具链能力的上限——例如，我们只能在悬停提示中展示 ID 变换前后的结果，而无法展示中间的衍生路径，这在复杂场景下会损失很多有价值的调试信息。

未来，`idDrvs` 有可能被升级为一个更复杂的“白盒”对象，例如一个包含变换步骤数组的 `idDrvs` 对象。这个对象将拥有 `.apply(initialId)` 方法以保持与函数形态等效的功能，同时允许工具链读取其内部的变换步骤，从而为开发者提供更强大的洞察力。

然而，对象化也会带来 API 和系统复杂度的提升。因此，在没有更迫切的需求出现之前，我们暂时维持其简单、直接的函数形态。
