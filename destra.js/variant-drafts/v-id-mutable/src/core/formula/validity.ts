import { traverse } from "../expr-dsl/parse-ast/sematics/traverse-ast";
import { CtxValidityState, getState } from "../state";
import { CtxExp, CtxVar, Expl, Formula, isCtxExp } from "./base";
import { FormulaType } from "./types";

declare module "../state" {
    interface CtxValidityState {
        missingCtxs: Set<CtxVar>;
        downstreamCtxExps: Set<CtxExp>;
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
        return { missingCtxs: new Set(), downstreamCtxExps: new Set(), hasInlineWith: false };
    }
    return s;
};

/**
 * Calculate the CtxValidityState for a formula and perform immediate validity checks.
 * This function should be called at the end of the formula creation process.
 */
export const evalCtxValidityState = (formula: Formula): CtxValidityState => {
    const missingCtxs = new Set<CtxVar>();
    const downstreamCtxExps = new Set<CtxExp>();
    let hasInlineWith = false;

    // 1. CtxVar: Depends on itself (conceptually)
    if (formula instanceof CtxVar) {
        missingCtxs.add(formula);
        return { missingCtxs, downstreamCtxExps, hasInlineWith: false };
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
        for (const d of depState.downstreamCtxExps) {
            downstreamCtxExps.add(d);
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
        // and add own CtxExp to downstreamCtxExps
        for (const v of formula.ctxVars) {
            missingCtxs.delete(v);
        }
        downstreamCtxExps.add(formula);

        // 4.3 Illegal Nested With Check
        if (formula.ctxKind === 'with') {
            // If any dependency or body has inline with, or AST has inline with -> Error
            if (hasInlineWith) {
                throw new TypeError("在 Expl 节点之间，with 语句不支持嵌套。");
            }
            // This expression itself IS a With, so it contributes true to upstreams
            hasInlineWith = true;
        }

    } 
    if (formula instanceof Expl) {
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

    // 5. ctxVar escape test
    // for every still missing ctxVar, check if it is in any downstreamCtxExps
    // it is supposed to be eliminated, so if we can still find unsatisfied ctxVar beyond the CtxExp scope, it is a leak
    for (const v of missingCtxs) {
        const sourceCtx = getState(v).ctxVar?.sourceCtx;
        if (sourceCtx && downstreamCtxExps.has(sourceCtx)) {
            throw new TypeError(`CtxVar ${v.name} 逃逸到外部作用域。`);
        }
    }

    return { missingCtxs, downstreamCtxExps, hasInlineWith };
};

/**
 * Helper to apply validity check and save state
 */
export const evalAndSetCtxValidityState = (formula: Formula) => {
    const state = evalCtxValidityState(formula);
    getState(formula).ctxValidity = state;
}
