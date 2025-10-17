# H2A Buffer

> H2A: Human to AI Buffer
> 本文件作为开发者与AI的临时信息交流缓冲区，作为空间临时放置文本片段。
> 以下的文本片段为临时片段，请勿认定为真实信息，注意与真实信息区分。

---


可变API: id可变 默认模式方案下所意图的是关系图不可变（上游依赖指向不可变，表达式内容不可变；实际上默认模式保证了"(本体)上游一定比下游先创建"）
引出了一个问题：显示属性和slider属性也有依赖指向，但是按照思维习惯它的api设计是方法调用/链式调用的；应该设计成不可变还是可变？
如果设计成expr dsl里设置这俩属性应该使用什么分割符？desmodder里用的是 expression @ { prop: value, ...} 的语法，但是个人有点不太喜欢 @ 这个符号
一些实验观察：
```
n = 1 @ { slider: @{ min: m }}; 
m = n
``` 
-> 错误: {n: "滑块最小值无效。请尝试使用任何数字。"， m: "m 和 n 不能互相定义。"}
```
n = (1,1) @ { points: @{ size: 10 * n.x, drag: "NONE" }, label: @{ size: 10 * n.y }, slider: @{ min: m} }
m = (1,1) @ { points: @{ size: 10 * n.x, drag: "NONE" }, label: @{ size: 10 * n.y } }
```
-> 显示两个可拖动的点。n点附带一个文本标签（内容为n的坐标），拖动m点可以控制n点的显示大小和文本标签字号大小；拖动n点可以控制m点的显示大小。drag: "NONE" 表示以默认模式进行拖动，与之相对的是限制只能横向或者纵向拖动的模式。另外 desmodder 里似乎没有 label 这一块的语法，这个是我自己为了示意加上去的

可以看出：slider属性在依赖分析上似乎属于公式的一部分；而显示属性却不然. 在内容上处于上游的公式的显示属性可以依赖于下游公式，而slider属性则不行。另外还有文本标签内容这一个公式的"部分"，而且它也能依赖其他表达式，而显然它也不参与依赖的循环分析。

或许可以把这些现象给它这样建模成一个多层的依赖模型：公式节点 -> 内容（如定义式节点）、显示属性、文本标签内容，定义式节点 ->（符号名称、）内容表达式、slider属性。slider属性（以及其他未来发现会影响依赖分析的属性）我们认为在定义式节点下，而其他属性则认为在定义式节点外。同时，其他公式通过引用符号引用到该条公式时，通过下游符号引用节点 -> 符号表 引用该条公式时，我们认为符号表的依赖指向的是公式节点下的内容字段即定义式节点，而非公式节点，即最终链接到公式列表的节点。



可以，我想再调整一下术语：
工具链 / DevEx 基础设施：预处理器/预处理能力/预处理功能（预处理器是被vite插件，volar语言服务等等共用的能力/模块），vite插件，volar语言服务/IDE插件，vite，volar（框架），其他尚未明确的desmos canvas集成模块；
开发场景：程序化图表构建（关键是使用JS库本身提供的API而非vite插件来构建；构建的背景/宿主不一定局限于web应用，也可以是node运行时）；图表构建程序打包（或者其他名字；这是由程序化图表构建衍生出的场景，如果用户是以创作形式来编写图表组织逻辑并通过js api来构建图表，但是这个程序化构建的逻辑位于一个比如说web前端项目内，而整个前端项目会被vite打包，那么在打包时也需要利用vite插件来进行代码的预处理）；静态图表构建；公式库开发与打包；图表实时预览与开发；Desmos Canvas中开发。


### 结论（技术选型）
- 运行时与构建链路：优先 Node.js LTS（建议 Node 20/22 LTS），避免 Deno/Bun（生态与工具链兼容度不足，尤其 IDE/TS/插件等）。
- 包管理与工作区：pnpm + pnpm workspaces（磁盘占用小、速度快、适合 monorepo）。
- 模块规范：ESM 优先，保留 `exports` 字段产出 CJS 兼容（如需）。
- 组织形态：单仓 monorepo，分“聚合包 `bernard`（对外唯一）”+“多模式包（内部并行探索）”+“共享基础包/工具包”。

### 目录布局（建议）
以当前仓库根 `Bernard/` 为准，在其下新增 `Bernard.js/`：
- `Bernard.js/`
  - `pnpm-workspace.yaml`
  - `tsconfig.base.json`
  - `scripts/`
    - `select-mode.mjs`（小脚本：切换默认模式 → 生成聚合包入口）
  - `packages/`
    - `core/`（公共类型/工具）
    - `compiler/`（编译流水线/冲突消解）
    - `ide-plugin-volar/`（Volar 插件与 `.hoverInfo()` 协议）
    - `bernard/`（聚合包，对外“默认版本”的唯一入口）
  - `modes/`
    - `default-current/`（默认模式：内容/依赖不可变，ID 可变，依赖 Volar 悬停）
    - `default-id-immutable/`（ID 不可变 API 版）
    - `default-jsx/`（类 JSX 版）
    - `default-augmented/`（增强语法/新语言试验版）
    - `genshin/`（“原神模式”）
  - `tests/`（e2e/smoke，用于验证聚合包稳定输出）

这样每个模式是独立包，互不干扰；`packages/bernard` 只负责“选择并转发”一个模式作为默认对外 API。

### 工作流要点
- 对外永远只发布/引用 `packages/bernard`（包名例如 `@bernardjs/bernard`）。
- 内部每个模式包都有自己的 `package.json`、`src/` 与构建产物 `dist/`。
- 通过根部配置文件（如 `mode.config.json`）+ 脚本 `scripts/select-mode.mjs`，将 `packages/bernard/src/index.ts` 重写为对选中模式的 re-export。Windows 上避免符号链接，直接“代码生成”最稳。

### 必要文件示例（可直接照抄改名）
- `pnpm-workspace.yaml`
```yaml
packages:
  - "packages/*"
  - "modes/*"
```

- 根部 `package.json`（私有 monorepo）
```json
{
  "name": "bernard-monorepo",
  "private": true,
  "packageManager": "pnpm@9",
  "scripts": {
    "select-mode": "node ./scripts/select-mode.mjs",
    "build": "pnpm -r --filter ./packages/* --filter ./modes/* build",
    "dev": "pnpm -r --parallel --filter ./modes/* dev",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test"
  }
}
```

- `mode.config.json`（根）
```json
{
  "defaultMode": "@bernardjs/mode-default-current"
}
```

- `scripts/select-mode.mjs`
```js
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const cfg = JSON.parse(readFileSync(resolve(root, "mode.config.json"), "utf8"));
const target = cfg.defaultMode;

const out = `export * from "${target}";\n`;
const outFile = resolve(root, "packages/bernard/src/index.ts");
writeFileSync(outFile, out);
console.log(`[bernard] default mode -> ${target}`);
```

- `packages/bernard/package.json`（聚合包）
```json
{
  "name": "@bernardjs/bernard",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "prebuild": "pnpm -w select-mode",
    "build": "tsc -p tsconfig.json && tsup src/index.ts --dts --format esm,cjs --out-dir dist"
  },
  "dependencies": {
    "@bernardjs/mode-default-current": "workspace:*",
    "@bernardjs/mode-default-id-immutable": "workspace:*",
    "@bernardjs/mode-default-jsx": "workspace:*",
    "@bernardjs/mode-default-augmented": "workspace:*",
    "@bernardjs/mode-genshin": "workspace:*"
  }
}
```

- 一个模式包示例 `modes/default-current/package.json`
```json
{
  "name": "@bernardjs/mode-default-current",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json && tsup src/index.ts --dts --format esm,cjs --out-dir dist",
    "dev": "tsup src/index.ts --watch --format esm,cjs --out-dir dist"
  },
  "dependencies": {
    "@bernardjs/core": "workspace:*"
  }
}
```

- `packages/bernard/src/index.ts`（由脚本生成）
```ts
export * from "@bernardjs/mode-default-current";
```

切换默认模式时，只改 `mode.config.json` 再执行一次 `pnpm -w build` 即可。

### 两个实现细节建议
- 类型对齐：每个模式都导出相同的对外 API 形状（函数名、类型签名一致），保证 `packages/bernard` 的 re-export 不会产生类型错配。
- 流水线：在 `packages/compiler` 固化“冲突消解/ID 生成/校验”等逻辑，模式只定义“语义差异（API 行为）”。这样“模式更迭”对底盘影响小。

### 针对你的四类默认模式分叉
- `@bernardjs/mode-default-current`：依赖 `ide-plugin-volar` 的 `.hoverInfo()` 协议；ID 可变；表达式内容/依赖不可变。
- `@bernardjs/mode-default-id-immutable`：禁止变更 ID；暴露 `.id()` 一锤定音；类型层可持久记录 ID（可在此模式里才生成更强 `.d.ts`）。
- `@bernardjs/mode-default-jsx`：单独配 TS/JSX 编译参数，可置 `jsxImportSource` 为 `@bernardjs/jsx-runtime`；在 `packages/` 下准备 `jsx-runtime`。
- `@bernardjs/mode-default-augmented`：引入新语法/预处理器（不要求合法 JS），可在构建阶段转成标准形式，产物仍复用 `packages/compiler`。

“原神模式”可另起包 `@bernardjs/mode-genshin`，统一被聚合包收编。

### 命令速记（Windows PowerShell）
- 初始化依赖安装：
```powershell
pnpm -w install
```
- 构建所有包：
```powershell
pnpm -w build
```
- 切换默认模式（编辑 `mode.config.json` 后）：
```powershell
pnpm -w select-mode
pnpm -w build
```
- 并行开发各模式：
```powershell
pnpm -w dev
```

### 这样做的优点
- 并行探索互不干扰；任何时候对外只有一个“默认”入口。
- 切换默认仅是重写聚合入口 + 重新构建，Windows 下无符号链接坑。
- 统一使用 Node.js + pnpm，生态与 IDE/TS 工具链摩擦最小。