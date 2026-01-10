
import { Formula, FormulaType, CtxVar, Expl, isCtxExp, CtxExp } from "./base";
import { getState, CtxValidityState } from "../state";
import { traverse } from "../expr-dsl/parse-ast/sematics/traverse-ast";

declare module "../state" {
    interface CtxValidityState {
        missingCtxs: Set<CtxVar>;
        hasInlineWith: boolean;
    }
}

/**
 * Get the validity state of a formula.
 * Assumes that the state has been calculated during creation.
 * If not present (e.g. for manually created objects or during migration), returns a safe default.
 */
const getCtxValidityState = (f: Formula): CtxValidityState => {
    const s = getState(f).ctxValidity;
    if (!s) {
        return { missingCtxs: new Set(), hasInlineWith: false };
    }
    return s;
};

/**
 * Calculate the CtxValidityState for a formula and perform immediate validity checks.
 * This function should be called at the end of the formula creation process.
 */
export const evalCtxValidityState = (formula: Formula): CtxValidityState => {
    const missingCtxs = new Set<CtxVar>();
    let hasInlineWith = false;

    // 1. CtxVar: Depends on itself (conceptually)
    if (formula instanceof CtxVar) {
        missingCtxs.add(formula);
        return { missingCtxs, hasInlineWith: false };
    }

    // 2. Gather from dependencies (deps)
    // For CtxExp, this includes head dependencies.
    // For others, this includes all dependencies.
    for (const dep of formula.deps) {
        if (!(dep instanceof Formula)) continue;
        const depState = getCtxValidityState(dep);

        for (const m of depState.missingCtxs) {
            missingCtxs.add(m);
        }
        if (depState.hasInlineWith) {
            hasInlineWith = true;
        }
    }

    // 3. Check AST for 'with' clause (for Expression / CtxExp)
    // If the formula itself contains a 'with' syntax in its DSL content.
    const ast = getState(formula).ast?.root;
    if (ast) {
        let withCount = 0;
        let astHasWith = false;
        if (hasInlineWith) withCount++;
        traverse(ast, {
            enter: (node) => {
                if (node.type === 'withClause') {
                    withCount++;
                    astHasWith = true;
                    if (withCount > 1) {
                        throw new TypeError("在 Expl 节点之间， with 语句不支持嵌套。");
                    }
                }
            },
            exit: (node) => {
                if (node.type === 'withClause') {
                    withCount--;
                }
            }
        });
        if (astHasWith) hasInlineWith = true;
    }

    // 4. Special handling by type
    if (isCtxExp(formula)) {
        // CtxExp: Context Statement

        // 4.1 Gather from body
        if (formula.body instanceof Formula) {
            const s = getCtxValidityState(formula.body);
            for (const m of s.missingCtxs) missingCtxs.add(m);
            if (s.hasInlineWith) hasInlineWith = true;
        }

        // 4.2 Remove own variables from missingCtxs (Requirement Satisfaction)
        for (const v of formula.ctxVars) {
            missingCtxs.delete(v);
        }

        // 4.3 Illegal Nested With Check
        if (formula.ctxKind === 'with') {
            // If any dependency or body has inline with, or AST has inline with -> Error
            if (hasInlineWith) {
                throw new TypeError("在 Expl 节点之间，with 语句不支持嵌套。");
            }
            // This expression itself IS a With, so it contributes true to upstreams
            hasInlineWith = true;
        }

    } else if (formula instanceof Expl) {
        // Expl (VarExpl, FuncExpl)

        // 4.5 Expl blocks 'hasInlineWith' propagation
        // A variable/function definition is a boundary for 'with' nesting checks.
        hasInlineWith = false;

        // 4.6 Illegal Closure Check (for Function)
        if (formula.type === FormulaType.Function) {
            if (missingCtxs.size > 0) {
                throw new TypeError("检测到外源上下文变量被传递到函数定义内。");
            }
        }
    }

    return { missingCtxs, hasInlineWith };
};

/**
 * Helper to apply validity check and save state
 */
export const evalAndSetCtxValidityState = (formula: Formula) => {
    const state = evalCtxValidityState(formula);
    getState(formula).ctxValidity = state;
}
