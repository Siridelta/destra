# 属性与样式API

> 本文档详细阐述 Destra “默认模式”中两类核心属性——计算属性（Slider）与显示属性（样式）——的设计理念与 API。

在 Destra 中，表达式的属性被明确地划分为两大类，它们的行为和设计理念截然不同，这直接指导了 API 的设计。

## 1. 核心原则：计算图不可变，可视化图可变

我们通过对 Desmos 行为的深入分析，可以用两种等价的视角（两种表示）来理解这个模型：

**1. 双依赖图表示**:
这是从整个系统的宏观结构出发的模型。

-   **计算依赖图 (Calculation Graph)**:
    *   **内容**: 包含公式的数学内容以及 **Slider 属性** (`min`, `max`, `step`)。
    *   **特性**: 这是一个严格的、禁止循环的依赖图。任何在此图上产生循环依赖的操作都会导致 Desmos 报错。
    *   **API 设计**: 因此，这部分对应的 API 必须设计为**不可变的**，在表达式创建时一次性定义。

-   **可视化依赖图 (Visualization Graph)**:
    *   **内容**: 包含所有**显示属性**（颜色、线宽、点大小等）和**标签内容**。
    *   **特性**: 这是一个次级的、更宽松的图。它的更新发生在计算图完成之后，它所依赖的是计算图的**最终输出值**，而非其内部结构，并且计算依赖图没有反向依赖（即两个图在一起没有构成循环）。因此，它允许出现表面上看似“一个表达式依赖另一个表达式，但是样式上反过来依赖，好像循环了”的依赖，但实际上没有循环。
    *   **API 设计**: 这部分对应的 API 可以被设计为**可变的**，允许在表达式创建后随时、动态地进行修改。

**2. 分层节点表示**:
这是从单个公式节点的内部结构出发的模型。

-   可以认为一个顶层的“公式节点”下辖两个子节点：
    *   **内容定义节点**：包含符号名、数学表达式和 **Slider 属性**。所有跨公式的计算依赖都指向这类节点，而非顶层的公式节点。
    *   **元数据节点**：包含**显示属性**和标签等。它们依赖于内容定义节点的计算结果，但没有反向的依赖边，因此不会在计算图中产生循环。

**统一的结论**:
结合默认模式的原则，这两种模型都导向了同一个结论：Slider 属性必须在表达式创建时定义且不可变，而显示属性可以在创建后自由、动态地修改，也就是**计算不可变，样式可变**。

## 2. Slider 属性的不可变 API 设计

由于 Slider 属性是计算图的一部分且不可变，它不适合使用链式方法（如 `.setMin(0)`）进行修改。我们决定将其作为表达式定义的一部分，在 **`Expr DSL`** (表达式领域特定语言) 中进行声明。

为了在 Expr DSL 中定义 Slider，我们引入 `in` 作为分隔词，将主表达式与 Slider 定义分开。

**语法**: ``expl`[表达式] in [最小值] : [步长] : [最大值]` ``

```javascript
// 创建一个名为 n 的表达式，其值为 1
// 同时为其定义 Slider 属性：范围 [0, 10]，步长 0.1
const n = expl`1 in 0 : 0.1 : 10`;
```
这种设计将 Slider 的定义与其数值紧密绑定，符合其作为计算图一部分的“不可变”特性。

## 3. 显示属性的可变 API 设计

与 Slider 属性相反，显示属性被设计为高度灵活、可动态修改的。

### 3.1 样式数据结构

首先，我们的目标是让用户在一个关于“样式”的数据模型上配置、编辑、读取、修改。Desmos 里关于样式的数据是伴随其他数据直接挂载在 ExpressionState 对象上的，而且很明显因为一些历史包袱原因数据结构其实设计的不是很好。因此我们也借此机会重构 style 相关的数据结构，即 Destra Style Schema，这个数据结构能提供一个比 Desmos 原生 `ExpressionState` 更直观、更有组织性的模型。

> **详情请参阅：[样式数据结构](./样式数据结构.md)**

### 3.1 三类功能 API 设计

我们需要满足用户在 IDE 中的声明式编写体验和 Console 中的调试需求，因此目前我们采用了一个明确区分 **配置(Configuration) / 编辑(Mutation) / 内省(Introspection)** 三类功能的 API 设计。

1.  **配置 (Configuration)**: `expr.style({ ... })`, `expr.setStyle({ ... })`
    *   面向 IDE 开发场景。
    *   提供声明式的对象结构，`.style({ ... })` 进行的是增量更新 / 深度合并 (Deep Merge)，`.setStyle({ ... })` 进行的是完全覆盖。
    *   返回表达式本身，支持链式调用。

2.  **编辑 (Mutation)**: `expr.style(editor => { ... })`
    *   面向需要精细控制或程序化修改的场景。
    *   提供一个强大的 **`Editor`** 句柄，支持原子化的读写操作和删除操作。

3.  **内省 (Introspection)**: `expr.styleData`
    *   面向 Console 调试和数据查看。
    *   这是一个**只读 Getter 属性**，返回当前样式的纯净、深拷贝、平凡对象的数据副本。
    *   完全“所见即所得”，无任何魔法属性。

#### 一级属性快捷方式

为了方便使用，在 Formula 对象上我们也为所有一级属性提供了快捷方式，例如 `myPoint.line(...)`，`myPoint.setLine(...)`，而不是 `myPoint.style({ color: ... })`。

根据我们的样式数据结构 (style schema)，目前支持的一级属性有：`hidden`, `color`, `line`, `point`, `fill`, `label`, `theta`, `phi`, `t`, `u`, `v`。因此在 Formula 对象上也会有以它们命名的方法以及 setField 方法。

### 3.2 使用示例

#### 声明式配置 (IDE 常用)

```javascript
// 链式调用配置
myPoint
    .style({
        color: "red",
        point: { size: 10 }
    })
    .line({ width: 2 }); // 快捷方式
```

#### 精细化编辑 (Editor 模式)

```javascript
myPoint.style(s => {
    // s 是 Root Editor 句柄
    
    // 1. 原生赋值：直接写入值
    s.color = "blue";
    s.point.size = 15;
    
    // 2. 中间节点赋值：自动进行 Merge
    s.label = { text: "Origin", size: 24 };
    
    // 3. 删除属性
    s.point.opacity = undefined; // 删除 opacity 属性
    s.fill.delete();             // 删除整个 fill 配置
});
```

可见，这个 API 设计可以很好地和其他功能的 API 进行链式调用的结合，获得的声明式配置体验。例如：

```javascript
const mosaicGrid = expl.with`
    Points = ${For`i = [0, ..., ${N}-1], j = [0, ..., ${N}-1]` (({i, j}) => 
        expr`(${i}, ${j})`
    )},
    Filter = ${For`i = [0, ..., ${N}-1], j = [0, ..., ${N}-1]` (({i, j}) => 
        expr`mod(${i} + ${j}, 2)`
    )},
`(({Points, Filter}) => 
    For`P = ${Points}[${Filter} = 0]`(({P}) => 
        expr`polygon(${P}, ${P}+(1, 0), ${P}+(1, 1), ${P}+(0, 1))`
    )
)
    .id("mosaicGrid")
    .realName("M_osaicGrid")
    .style({
        color: "red",
        line: { width: 2 },
        fill: { opacity: 0.5 },
    })
```

### 3.3 `Editor` 对象详解

`Editor` 是仅在编辑回调中存在的操作句柄。我们需要借助这个 Editor 句柄，既给予用户自由编辑样式内容的能力，又保证用户的编辑操作限制在 Style Schema 的范围内。目前我们采用了一种 **“全 Editor 节点 + 不对称读写”** 的设计模式，可以提供统一且强大的操作体验。

#### 核心特性

1.  **全 Editor 节点**: 
    无论你访问的是中间节点（如 `s.point`）还是叶子节点（如 `s.point.size`），Getter 返回的永远是一个 **`Editor` 实例**。这保证了你可以在任何层级调用 Editor 的方法（如 `.delete()`）。

2.  **不对称原生读写 (Asymmetric Native Access)**:
    *   **写入 (Setter)**: 直接接受**值**。
        *   `s.point.size = 10` —— 写入数字 `10`。
        *   `s.point = { size: 10 }` —— 写入配置对象（完全覆盖）。
    *   **读取 (Getter)**: 返回 **Editor 实例**（句柄）。
        *   `s.point.size` —— 返回一个 `LeafEditor` 对象。
    
    这种设计让我们既能享受原生赋值（`=`）的便利，又能保持操作句柄的统一性。

3.  **显式读值**:
    由于 Getter 返回的是 Editor 句柄，如果你需要获取当前的真实值（例如用于计算），必须显式调用 `.value` 属性。
    
    ```javascript
    s.style(e => {
        // 错误！e.point.size 是一个对象
        // const doubleSize = e.point.size * 2; 
        
        // 正确：显式读取真实值
        const currentSize = e.point.size.value || 10;
        e.point.size = currentSize * 2;
    });
    ```

#### Editor 方法 API

所有 Editor 节点（无论层级）都提供以下方法：

-   **`.delete()`**: 删除该节点对应的数据。
    *   等效于 `s.field = undefined`。
-   **`.set(value)`, `.set(value => newValue)`**: 显式赋值，完全覆盖当前值。
-   **`.update(value)`**: 显式更新值。
    *   对于中间节点，执行 Deep Merge。
    *   对于叶子节点，直接覆写值。
-   **`.edit(callback)`**: 进入子作用域进行编辑。
    *   `s.point.edit(p => p.size = 10)`。
-   **`.value` (Getter)**: 获取当前节点的真实数据（Plain Object 或 Primitive Value）。
    *   这也是 `.toJSON()` 的实现，方便序列化。
