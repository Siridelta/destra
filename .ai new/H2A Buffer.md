# H2A Buffer

> H2A: Human to AI Buffer
> 本文件作为开发者与AI的临时信息交流缓冲区，作为空间临时放置文本片段。
> 以下的文本片段为临时片段，请勿认定为真实信息，注意与真实信息区分。

---

expr dsl术语的确立需要在js路线，不，甚至是总体路线里说明，而不是在默认模式的一个子文档里说明？

两类模型/表征尚未引入



---

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