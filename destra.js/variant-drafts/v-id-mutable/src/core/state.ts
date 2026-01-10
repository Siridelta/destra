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
import { Label } from "./formula/label";

/**
 * Formula 对象的内部状态接口。
 * 
 * 包含多个子状态接口，分别用于不同的功能模块。
 * 
 * 子状态接口默认是一个空接口。各个功能模块应使用 declare module 扩展此接口，
 * 添加其所需的特定状态字段。
 * 
 * @example
 * ```typescript
 * // in id.ts
 * declare module "../state" {
 *     interface ExplIdState {
 *         idData?: IdData;
 *         realname?: string;
 *     }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CtxVarState { }
export interface ExplIdState { }
export interface StyleState { }
export interface ASTState { }
export interface CompileState { }
export interface CtxValidityState {}

export interface FormulaState {
    // State specific to CtxVar --- realname
    ctxVar?: CtxVarState;
    // State specific to Expl --- id, realname, ...
    explId?: ExplIdState;

    // Common states
    style?: StyleState;
    ast?: ASTState;
    compile?: CompileState;    // ast tree, compiled latex string
    ctxValidity?: CtxValidityState;
}

/**
 * 全局状态存储 (WeakMap)
 * 
 * 使用 WeakMap 确保状态对象的生命周期与 Formula 对象绑定，
 * 当 Formula 对象被垃圾回收时，其关联的状态也会自动释放。
 */
const formulaStates = new WeakMap<Formula, FormulaState>();

/**
 * Label 状态
 */
export interface LabelState {
    compile?: LabelCompileState;
}
export interface LabelCompileState {
    compiled?: string;
}
const labelStates = new WeakMap<Label, LabelState>();


// --- getState functions ---

/**
 * 获取 Formula 对象的关联状态。
 * 
 * 如果状态对象不存在，会自动初始化一个新的空对象。
 * 
 * @param formula - 目标 Formula 对象
 * @returns 关联的 FormulaState 对象
 */
const getFormulaState = (formula: Formula): FormulaState => {
    let maybeState = formulaStates.get(formula);
    if (!maybeState) {
        maybeState = {};
        formulaStates.set(formula, maybeState);
    }
    return maybeState;
};

/**
 * 获取 Label 对象的关联状态。
 * 
 * 如果状态对象不存在，会自动初始化一个新的空对象。
 * 
 * @param label - 目标 Label 对象
 * @returns 关联的 LabelState 对象
 */
const getLabelState = (label: Label): LabelState => {
    let maybeState = labelStates.get(label);
    if (!maybeState) {
        maybeState = {};
        labelStates.set(label, maybeState);
    }
    return maybeState;
};

/**
 * 获取 Formula 对象的关联状态。
 * 
 * 如果状态对象不存在，会自动初始化一个新的空对象。
 * 
 * @param formula - 目标 Formula 对象
 * @returns 关联的 FormulaState 对象
 */
function getState(formula: Formula): FormulaState;
/**
 * 获取 Label 对象的关联状态。
 * 
 * 如果状态对象不存在，会自动初始化一个新的空对象。
 * 
 * @param label - 目标 Label 对象
 * @returns 关联的 LabelState 对象
 */
function getState(label: Label): LabelState;
function getState(obj: Formula | Label): FormulaState | LabelState {
    if (obj instanceof Formula) {
        return getFormulaState(obj);
    }
    if (obj instanceof Label) {
        return getLabelState(obj);
    }
    throw new Error('Invalid object type');
}
export { getState };
