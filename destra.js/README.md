# Destra.js 简版使用指南

简单介绍如何使用 Destra.js 创建一个 js 项目，构建 Desmos 图表，并实时预览。

## 1. 安装

创建新项目文件夹：
```bash
mkdir destra-test-project
cd destra-test-project
```

1.1. 初始化 npm 项目：
```bash
npm init
```
或者使用 pnpm：
```bash
pnpm init
```

1.2. 安装 Destra.js 和 Vite：
```bash
npm install --save-dev @ad-destra/destra @ad-destra/vite-plugin-destra vite
```

或者使用 pnpm：
```bash
pnpm install --save-dev @ad-destra/destra @ad-destra/vite-plugin-destra vite
```


1.3. 修改 package.json 文件，将 destra 的依赖改为 latest

这样可以最快速度接收到我推送到 npm 的更新

```json
"dependencies": {
    "@ad-destra/destra": "latest",
    "@ad-destra/vite-plugin-destra": "latest"
    // ... other dependencies
}
```

1.4. 创建 vite.config.ts 文件：
```ts
import { defineConfig } from 'vite';
import destraPlugin from '@ad-destra/vite-plugin-destra';

export default defineConfig({
    plugins: [
        destraPlugin({
            entry: './graph.js',              // 你的图表文件路径
            // apiKey: 'your-api-key',        // 可选，默认使用 v1.10 以下公开测试 API Key
            // version: 11                    // 可选，默认使用 v1.10 (version: 10)
        })
    ],
    server: {
        port: 3000
    }
});
```
默认使用 Desmos v1.10，若需要使用最新版本 Desmos（v1.11/v1.12），需要从 Desmos 官网获取 API Key

## 2. 创建图表文件

创建一个名为 `graph.js` 的文件，内容如下：

```js
import { expr, expl, Graph, Folder } from "@ad-destra/destra";

// 1. 定义变量
const a = expl`1 in 0:1:10`.id('a');
const b = expl`2 in 0:1:10`.id('b');

// 2. 定义公式
const f = expl`(x, y) => cos(x ^ ${a}) + cos(y ^ ${b})`.id('f');
const i1 = expr`[-2, -2+1/2, ..., 1] < ${f}(x, y)`
    .showParts({lines: false});

// 3. 导出图表
const graph = new Graph({
    root: [
        new Folder({
            title: "Playground Demo",
            children: [a, b, f]
        }),
        i1
    ],
    settings: {
        showGrid: true,
        viewport: {
            xmin: -10, xmax: 10,
            ymin: -10, ymax: 10
        }
    }
});

export default graph;
```

### 定义公式: expr 和 expl

expr 和 expl 是 Destra.js 的两种基本公式类型。expr（'expression'的缩写）用于代表可以被复用、插入任何地方的表达式片段；expl （'explicit'的缩写）用于代表明确声明为变量（或函数），可以被后续引用的变量定义。

使用 js 模板字面量语法创建 expr 和 expl 公式：

```js
const a = expl`1 in 0:1:10`.id('a');    // 定义一个变量 a，值为 1
const b = expl`2 in 0:1:10`.id('b');    // 定义一个变量 b，值为 2
// .id('a') 和 .id('b') 的含义稍后解释
```

> 注：使用 `in` 语法定义变量的滑动条范围（仅 Expl 变量定义支持），格式为`min : step : max`，这三处都支持插入 destra 公式，并且支持省略语法如 `min : max`，`min :: max`，`min : step : max`，`: step : max`，`min`，`::max`，`:step:`等。

使用插值语法 `${...}` 复用表达式或引用变量：

```js
const f = expl`(x, y) => cos(x ^ ${a}) + cos(y ^ ${b})`;    // 定义一个函数 f，值为 cos(x ^ a) + cos(y ^ b)，引用变量 a 和 b
const i1 = expr`[-2, -2+1/2, ..., 1] < ${f}(x, y)`    // 定义一个隐式方程 i1，值为 [-2, -2+1/2, ..., 1] < f(x, y)，引用函数 f
```

变量和函数都使用 `expl` 定义，只有使用 `expl` 定义的 destra 公式在 desmos 里会以变量/函数定义的形式呈现，在别处引用时直接引用变量/函数名；

而使用 `expr` 定义的 destra 公式在 desmos 里会以表达式片段的形式呈现，在别处引用时直接复制代入表达式内容。

尝试将 `a` 和 `b` 的定义改为：
```js
const a = expr`1`;
const b = expr`2`;
```
图表里是不是少了两个变量定义？并且 f 的定义也变成了 `(x, y) => cos(x ^ 1) + cos(y ^ 2)`，而不是 `(x, y) => cos(x ^ ${a}) + cos(y ^ ${b})`.

destra 根据公式代码内容，和使用 `expr` 还是 `expl`，创建的公式分为几种公式类型，包括：

- 表达式 (Expression)：`expr` 支持，语法例如：`1 + 2`
- 变量定义 (Variable Definition)：`expl` 支持，语法例如：`1 + 2`，`a = 1 + 2`
- 函数定义 (Function Definition)：`expl` 支持，语法例如：`f(x) = 1 + 2`
- 隐式方程 (Implicit Equation)：`expr` 支持，语法例如：`x^2 + y^2 = 4`，`x^2 + y^2 < 4`
- 显式方程 (Explicit Equation)：`expl` 支持，语法例如：`y = ${k}x + ${b}`，`x = sin(y)`，`h = ${h0} + ${v0}t - 1/2gt^2`
- 回归（Regression）：`expr` 支持，语法例如：`${Y} ~ k${X} + b`，要求 X 与 Y 为列表以作数据分析。

### 公式 ID

destra 里使用 'ID' 来沟通 desmos 变量名的局限性和 js 变量名的自由度。

我们定义 Expl 变量/函数时，通过设置 `expl_formula.id('a')` 来设置 Destra ID，这个 ID 会在编译时自动转换为尽量近似的 Desmos 变量名。在 Destra 图表里 ID 是唯一标识，它只能被一个公式使用，一个公式只能属于一个 ID。

ID 支持常用的大小写字母+数字+下划线（首字符不为数字），并且除了 ID 之外在 Destra 里出现的其他变量名（如显式方程的未定义变量名，for, with, sum 等上下文语句的上下文变量名，回归的回归参数名）都支持这个范围；

但是 ID 本身还支持点号分段格式：`myLib.vec`，`myLib.physics.gravity`，`myLib.physics.core.initialPosition` 等。它可以用于模拟命名空间范式，辅助库作者和使用者组织公式。

ID 可以被多次反复设置，也可以通过 `.prefix()` 方法添加 ID 段前缀：

```js
const a = expl`1`.id('a');
a.id('a1');             // 重新设置 ID 为 a1
console.log(a.id());    // .id() 方法也可用来获取现有 ID 状态，这里为 "a1"

a.prefix('myLib');      // 添加 ID 段前缀 myLib
console.log(a.id());    // "myLib.a1"

// 一般情况下它最终生成的 Desmos 变量名将为 "a_{1MyLib}"
```

只有 expl 变量/函数定义可以设置 ID，expr 表达式片段不能设置 ID（expr 表达式没有变量名概念）。

如果创建时不设置 ID，在使用创作模式/预处理器条件下，会自动生成一个隐式 ID，这个 ID 会根据 JS 变量名自动生成（预处理器现在我还没写完所以暂时不支持，而且也暂时不支持 ts 完整的类型标注）

expl 公式使用具名语法创建时，名称即为设置的初始 ID。使用不具名语法创建时，则不设置初始 ID（在预处理器上线后转换时会根据 JS 变量名自动生成一个默认 ID）。

```js
const a = expl`a = 1 in 0:1:10`;   // 变量定义 - 具名语法
const b = expl`2 in 0:1:10`;       // 变量定义 - 不具名语法
const c = expl`c(x, y) = cos(x ^ ${a}) + cos(y ^ ${b})`;   // 函数定义 - 具名语法
const d = expl`(x, y) => cos(x ^ ${a}) + cos(y ^ ${b})`;   // 函数定义 - 不具名语法
```

## 3. 组织图表

Destra 图表使用 `Graph` 对象来组织图表内容，`Graph` 对象可以包含多个公式和多个 `Folder` 对象，`Folder` 对象可以包含多个公式，直接对应 Desmos 的文件夹组织结构。

```js
const graph = new Graph({
    root: [
        new Folder({
            title: "Playground Demo",
            children: [a, b, f]
        }),
        i1
    ],
    settings: {
        showGrid: true,
        viewport: {
            xmin: -10, xmax: 10,
            ymin: -10, ymax: 10
        }
    }
});
```

图表设置基本对应 Desmos 的 Graph Settings，可以设置视口、网格、坐标轴等。

事实上 destra 可以自动收集公式的上游依赖，例如如果你把 Folder 删掉，只留下 i1：

```js
    root: [
        i1
    ]
```

destra 会自动收集 i1 的上游依赖，包括 a, b, f, 并自动将它们放进图表。这些有必要放进图表的 expl 依赖称为隐式顶级公式（implicit roots），可以通过 destra 设置来控制这些 implicit roots 的放置位置。

```js
const graph = new Graph({
    // root & settings ...
    destraSettings: {
        implicitRootPosition: "TOP"    // "TOP" | "BOTTOM"，默认放置在顶端
        implicitRootFolder: {          // 可选，若不设置则不将 implicit roots 放进文件夹
            title: 'Implicit Roots';   // 文件夹标题
            id: '10086';               // 可选，文件夹 ID，默认自动生成（这里指 desmos 的 Row ID，注意与 destra expl 公式的 ID 区分）
        }
    }
});
```

最后，你需要将图表导出为 JS 模块导出：

```js
export default graph;
```

同时需要在 package.json 文件中将 type 改为 module：

```json
{
    // ...
    "type": "module"
}
```

这样 vite 会识别这个文件里所导出的 Graph 对象，并根据它自动构建 Desmos 预览页面。

## 4. 预览图表

在 vite.config.ts 文件中设置你的图表入口文件路径；也可设置 API Key 和 Desmos 版本，以及服务器默认端口等等。

```ts
import { defineConfig } from 'vite';
import destraPlugin from '@ad-destra/vite-plugin-destra';

export default defineConfig({
    plugins: [
        destraPlugin({               // 载入 vite-plugin-destra 插件
            entry: './graph.js',       // 你的图表文件路径，上例为 ./graph.js
            // apiKey: 'your-api-key',
            // version: 11
        })
    ],
    server: {
        port: 3000                 // 可选，服务器默认端口，默认 3000
    }
});
```

然后运行 `npx vite` / `pnpm vite` 即可预览图表。浏览器打开 `http://localhost:3000` 即可看到图表。

修改图表代码文件并保存后，浏览器会自动刷新预览。

可以添加 dev 指令到 package.json 文件中：

```json
{
    // ...
    "scripts": {
        "dev": "vite"
    }
}
```

## 5. 其他功能

### 样式设置

```js
import { expr, expl, label } from "@ad-destra/destra";

const a = expl`a = 1`;
const b = expl`b = 2`;
const c = expl`c = #25FF9D`;
const d = expl`d = 4`;


const e = expr`x^2`
    .fill({ opacity: a })
    .line({ width: b })
    .point({ size: d, opacity: a })
    .color(c)
    .label({ text: label`d = ${d}` });   // 渲染变量值，编译为 '`d = ${d}`' (如果公式 d 的真名解析为 'd')
```

### 上下文表达式

可以在模板字面量代码里直接使用 with, for 等语法，也可以使用下面这种工厂函数语法：

```js
const A = With`a = 1`(({a}) => expr`${a} + 1`);          // 创建为 expr 公式
const A1 = expl.With`a = 1`(({a}) => expr`${a} + 1`);    // 创建为 expl 公式
const B = For`i = [1...10], j = [1...10]`(({i, j}) => 
    expr`(${i}, ${j})`
);
const C = Sum`i = 1, 10`(({i}) => expr`${i}^2`);
const D = Int`x = 0, 1`(({x}) => expr`${x}^2`);
const E = Func`x, y`(({x, y}) => expr`${x}^2 + ${y}^2`);    // 没有 expl.Func 语法，Func 工厂永远创建为 expl 公式
const F = Diff`x`(({x}) => expr`${x}^2`);                // d/dx x^2，虽然感觉可能没什么用
```

### 回归（Regression）与回归 hack 支持

回归 bug 作为 desmos 里古神级别的特性，为我们创建循环依赖，并以此在不使用 Action 的情况下进行数据动态迭代提供了可能。

一般情况下 Destra （默认模式方案）严格限制公式依赖，不允许悬空依赖，循环依赖等等，公式内容设定后不可变；但是 destra 不把回归变量视为回归公式的下游依赖，两者之间的关系不视为“依赖关系”而更多只是一种设置值的关系，因此 Destra 提供支持帮助你将回归变量的声明提前，并在使用之后在最后再代入回归公式完成定义：

```js
import { expr, expl, regr, Graph, LoopMode } from "@ad-destra/destra";

const R = expl`3.131 in 1:4`.id('R');

const a_reg = regr('a_reg');
const a_next = expl`${R} * ${a_reg} * (1 - ${a_reg})`.id('a_next');
const a = expl`.5 in ${a_next}:${a_next}`.id('a')
    .slider({
        playing: true,
        speed: 1,
        loopMode: LoopMode.LOOP_FORWARD_REVERSE,
    });

const reg = expr`${a} ~ ${a_reg}`;

const graph = new Graph({
    root: [
        reg,
        a_next,
        a_reg,
        a,
        R,
    ],
})

export default graph;
```

这个图表可以让 a 的值不断跳变，执行逻辑斯特迭代（Logistic Map）。
在 Desmos 里，首先 reg 回归公式根据 a 的初始值计算出待“回归”的回归变量 a_reg 的值，然后 a_next 公式根据 a_reg 的值计算出 a 的下一个值，然后因为 a 变量上下限都被 a_next 公式限制，只要让 a 动画播放（而且这里已经设置成正在播放），a 的值就会被强制设置为 a_next 公式的值，然后 reg 回归公式根据新的 a 值计算出新的 a_reg 值，然后 a_next 公式根据新的 a_reg 值计算出新的 a 值，如此往复，形成一个循环。

实现这类技术的关键在于，在 Destra 里为了定义关系严格被依赖的公式必须先于依赖它的公式创建，但是回归公式允许你先使用回归变量，再在最后代入回归公式完成定义。

