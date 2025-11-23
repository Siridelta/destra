/**
 * 核心状态管理模块
 * 
 * 本模块实现了基于 WeakMap 的全局状态存储模式 (Sidecar State Pattern)。
 * 它允许我们将 Formula 对象的内部状态（如 ID、Style、文档等）从对象本身剥离，
 * 从而保持 Formula 对象的纯净性，并实现更好的模块化解耦。
 * 
 * 各个功能模块（如 id.ts, style.ts）可以通过 Interface Merging 扩展 FormulaState 接口，
 * 并通过 getState() 获取状态对象。
 */

import { Formula } from "./formula/base";

/**
 * Formula 对象的内部状态接口。
 * 
 * 默认是一个空接口。各个功能模块应使用 declare module 扩展此接口，
 * 添加其所需的特定状态字段。
 * 
 * @example
 * ```typescript
 * // in id.ts
 * declare module "../state" {
 *     interface FormulaState {
 *         idMeta?: IdMetadata;
 *     }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FormulaState { }

/**
 * 全局状态存储 (WeakMap)
 * 
 * 使用 WeakMap 确保状态对象的生命周期与 Formula 对象绑定，
 * 当 Formula 对象被垃圾回收时，其关联的状态也会自动释放。
 */
const states = new WeakMap<Formula, FormulaState>();

/**
 * 获取 Formula 对象的关联状态。
 * 
 * 如果状态对象不存在，会自动初始化一个新的空对象。
 * 
 * @param formula - 目标 Formula 对象
 * @returns 关联的 FormulaState 对象
 */
export const getState = (formula: Formula): FormulaState => {
    let state = states.get(formula);
    if (!state) {
        state = {};
        states.set(formula, state);
    }
    return state;
};

