/**
 * 预处理器占位实现。
 *
 * 旧版架构将其放在 `shared/preprocessor` 包中，现改为直接内嵌在 variant 内。
 * 后续可在此实现针对可变 ID 方案的语法预处理与校验流程。
 */
export const preprocess = (): never => {
  throw new Error("preprocess 尚未实现：请在 v-id-mutable 内补充具体逻辑。");
};


