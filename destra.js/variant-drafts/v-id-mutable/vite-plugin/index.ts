/**
 * Vite 插件占位实现。
 *
 * 旧版工程化方案中插件位于 `facade/vite-plugin-destra`，为了保持“variant
 * 自包含”原则，我们在各 variant 内部直接维护所需的开发工具。若未来
 * 需要真正发布插件，可在此补充实现并在 `package.json` 中配置入口。
 */
export const createDestraPlugin = (): never => {
  throw new Error("createDestraPlugin 尚未实现：请在 v-id-mutable 内补充具体逻辑。");
};


