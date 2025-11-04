export * from "./core/index";
export * from "./preprocessor/index";
export * from "./types/index";

/**
 * `coreReady` 是可变 ID 版本在最初阶段的运行时初始化占位实现。
 *
 * 该函数未来将负责连接核心表达式系统（见 `./core/index.ts`）与宿主环境
 * 的渲染逻辑，例如构建 Desmos state、挂载监听等。目前我们仅抛出错误，
 * 提醒开发者在 variant 内部继续完善。
 */
const coreReady = (): never => {
  throw new Error("coreReady 尚未实现：请在 v-id-mutable 内补充具体逻辑。");
};

export const mutableVariant = {
  /**
   * variant 自身提供的核心初始化入口。保持占位符，以便后续直接扩展。
   */
  coreReady
};

