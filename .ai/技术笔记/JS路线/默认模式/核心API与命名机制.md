# 核心API与命名机制

> 本文档详细阐述 Destra “默认模式”的核心 API 与命名机制。这是默认模式工程化能力的基础，旨在解决 JavaScript 的灵活性与 Desmos 符号系统的严格性之间的矛盾，并提供强大的模块化与代码复用能力。

## 1. 核心问题与设计目标

设计的起点源于一个复杂的问题和矛盾：

我们需要给 expl 公式（代表 Desmos 变量与 Desmos 函数）命名，以提供语义提示。

Destra 公式是 JS 对象，需要用 JS 变量存储，并且在我们设计的模板字面量插值方式的变量代入场景里，插入、引用的也是 JS 变量名，因此在命名工作里首先会涉及到 JS 变量名的命名；而且在复杂操作中我们往往会用不止一个 JS 变量来引用一个 Destra 公式对象，也就是会涉及到多个不同的 JS 变量名（如在多个模块之间导入导出时会在各个模块里重新使用 JS 变量名来引用同一个 Destra 公式对象）。

我们也需要指定公式的最终真实 Desmos 变量名（后面简称为 Desmos 真名）。Desmos 变量名不能是随机生成的名称，如果随机生成名称，那么在 Live Preview 开发场景里，我们一边开浏览器，一边开 IDE，两边对照代码时看到的是一边是可读性良好的 JS 代码，一边是可读性很差的 Desmos 公式和变量名，这样依然非常不便于开发。

因为 JS 变量名并非稳定参考（一个公式可能被多个 JS 变量名涉及），所以在代码里我们需要同时明确指定一条公式的（一个或多个）JS 变量名和 Desmos 真名。我们也可以通过引入预处理器（对 JS 源代码本身进行预处理）、扩展 JS 语言本身（预处理器方案的详细细节可见下文）来指定“Desmos 真名默认为 Destra 公式对象创建时所立即赋予的 JS 变量名”。

但是 Desmos 变量名称格式具有较窄的限定范围，格式必须为“单字母加可选的下标部分”。这本是在 Desmos 使用 mathquill 数学公式编辑器的基础上为了接近数学风格、同时支持隐式连乘而作的限制。但是在 JS 编程环境里公式内容不再是纯粹的数学公式风格而是代码式风格，在这样的 DevEx 环境下这种“单字母+下标”的命名限制变得没有意义：如果显式指定 Desmos 真名，那么这种风格的 Desmos 真名出现在代码里也会严重降低代码的整体可读性；如果隐式指定 Desmos 真名（比如上面所述的预处理器方案，默认设置 Desmos 真名为立即赋值的 JS 变量名，并且并非在全部时候都有效），那么必须进行一种范围缩小的转换，以及可能还需要处理命名冲突、自动重命名的问题。

因此，我们尝试在 JS 变量名层面和 Desmos 变量名层面之间增加一个“中间层”，来调和这两层之间的矛盾，同时给用户带来更多自由操作的空间。这个中间层我们称为 Destra 标识（Destra ID），它是 JS 对象内的数据（而不像JS 变量名是 JS 程序逻辑里的标识），同时它允许比 Desmos 真名范围更大的、符合常理的合法空间（wordchar，不以数字开头），然后在图表编译时进行一次 ID 到真名的映射转换，包含冲突解决的逻辑。

## 2. 三层命名系统

1.  **JS 变量名 (JS Variable Name)**
    -   **形式**: JS 变量名，由字母、数字、下划线、美元符号 `$` 组成，不能以数字开头。
    -   **角色**: JS 程序逻辑中 JS 变量使用的名字。
    -   **描述**: 这是开发者在代码中直接使用的名字，如 `const myVector = expl(...)`。它的主要作用是服务于代码的编写和组织，但由于它在模块导入时可以被任意重命名，因此本身是不稳定的，不能作为公式的唯一身份标识。

2.  **Destra 变量名层 (Destra Variable Name Layer)**

    以 Destra ID 为主，Destra ID 和 DSL 内部变量名合称为 Destra 变量名层。

    1. **Destra 标识 (Destra ID)**
        -   **形式**: Destra 公式对象内存储的数据，`string` 类型，由点号 `.` 连接的一个或多个字符串段组成，每段由字母、数字、下划线组成，不以数字开头。在可变 ID 路线中可在公式创建后通过 API 继续修改。
        -   **角色**: 一个 Destra 图表对象内公式列表的**主键 (Primary Key)**（Destra 图表对象是对 Desmos 图表的抽象，用于编译为 Desmos 图表 / Desmos state JSON，见[图表编译与导出](./图表编译与导出/index.md)），`string` 类型，在最终图表对象里全局唯一。
            - *注：在 JS 环境里允许创建多个 ID 重名的公式（我们无法也不应限制这种操作），但是它们最终不能进入同个图表对象。*
        
        - 这是 expl 公式在 Destra 框架内部的**真正身份**。它独立于 JS 变量名，由库作者定义，确保了无论公式在何处被引用、JS 变量名如何被重命名、JS 引用方式如何变化，其内在身份始终不变。ID 的全局唯一性是解决模块化冲突的基石。但是为了让代码简单，我们让创作形式里可以不用指定ID，而在预处理转换时会根据 JS 变量名自动生成一个默认 ID。

        -   **分段式**: 

            ID 作为一个图表项目里的全局唯一标识符，在项目内如果有两个公式使用相同的 ID 字符串会导致冲突。
            
            但是我们要让用户能够像使用 npm 包一样，模块化地分发、组合和复用 Destra 代码，同时避免命名冲突并提供良好的开发者体验（DevEx）。
            
            为了辅助库创作者能够很好的组织和管理公开到生态里的公式，我们模仿 Java 等语言的点号分隔的包名 / 命名空间名的思路，允许并鼓励公式库作者使用**用点号 `.` 连接的分段式 ID**，以起到类似命名空间、管理变量的作用。

            如：`myLib.vec`、`myLib.physics.gravity`、`myLib.physics.core.initialPosition` 等。

    2. **DSL 内部变量名**
        在有些场景里也会涉及需要在 DSL 内部直接引用变量名或未定义变量名的情况：

        -   **上下文变量**: 在上下文语句（DSL 内部编写 & 工厂函数创建）中定义的上下文变量，以及函数定义的参数。（如 `(cos a, sin a) for a = [0...12]/12*2pi` 里的 `a` 等）
        -   **显式方程**: 如果一个顶级运算符为等号、符合显式方程的格式，并且在 DSL 内部使用了未定义变量（“悬空符号”），将会尝试将公式对象分析为显式方程，此类变量也被视为 DSL 内部变量引用。（如 `V = 4/3 pi R^3` 中的 `V`, `R` 等）（关于显式方程见[03-公式类型与符号系统.md](../Desmos建模/03-公式类型与符号系统.md)）
        -   **回归参数**: 如果顶级运算符为回归运算符（`~`），将会尝试将该公式对象分析为回归公式，公式里所涉及的各个未定义（待定义）的回归参数也被视为 DSL 内部变量引用。（如 ``expr`${Y} ~ k ${X} + b` `` 中的 `k`, `b` 等）
        
        -   **单段式命名**:
            如果允许 DSL 内部变量名具有多段，可能会带来语法解析上的一些困难。同时在 DSL 内部变量名的这几个使用场景里，这些变量也往往只起到“局部/临时符号”的作用。所以我们限制其为**单段式**（即不包含点号）：
            *   合法：`i`, `myVar`, `alpha`
            *   非法：`my.var`, `lib.param`    

3.  **Desmos 真名 (Desmos Name)**
    -   **角色**: 最终产物。
    -   **描述**: 这是最终生成到 Desmos 图表中的、符合其命名规则的符号名。它由 Destra 编译器根据 Destra ID **自动生成**，默认保证人类可读（例如 `myLib.vec` -> `m_yLib_vec`），并能自动解决冲突（例如添加数字后缀 `v_1`, `v_2`）。
    -   **命名冲突解决优先级**: 为了保证最终生成变量名的可读性和可预测性，编译器在解决命名冲突时，会赋予**隐式ID**（由预处理器根据JS变量名自动生成）**较低的优先级**。这意味着，当两个不同的 Destra ID 希望生成同一个 Desmos 真名时，拥有显式ID（由库作者通过 `.id()` 等方式构建）的表达式将更有可能获得它想要的更可读的名字。

## 3. 核心 API 与工作流

经过多个版本的方案演进，我们最终确定了一套包含**可变 ID**与**工具链增强**的方案，同时选择倡导开发者不将 ID 体系与物理文件结构耦合，而是主动维护一个稳定的、与物理文件结构**异构**的逻辑 ID 体系，从而保证库的 API 稳定性和下游使用体验。

### 3.1 两类表达式的创建与 ID 赋予

重新说明我们的双类型模式：
-   ``expl`...` ``: 用于创建一个**具名声明 (Explicit Declaration)**，须带有 Destra ID，或至少在最终编译导出之前设置其 Destra ID，否则编译器会报错。这是构成计算图的基本节点。
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
