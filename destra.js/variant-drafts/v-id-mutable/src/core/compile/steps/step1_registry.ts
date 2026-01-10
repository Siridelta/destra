
import { Expl, Formula, CtxExp, CtxVar } from "../../formula/base";
import { normalizeName2 } from "../../formula/realname";
import { getState } from "../../state";
import { CompileContext, Folder, Graph } from "../types";

export const registryAndCollisionCheck = (graph: Graph): CompileContext => {
    const context: CompileContext = {
        // Step 1 Output
        idMap: new Map(),
        // 3 tables: formula -> folder, formula -> root, formula -> implicit root
        formulaToFolder: new Map(),
        rootFormulas: new Set(),
        implicitRootFormulas: new Set(),
        ctxVarForceRealnameSet: new Set(),

        // Step 2 Output
        globalRealnameMap: new Map(),
        globalUsedNames: new Set(),

        // Step 3 Output
        ctxVarRealnameMap: new Map(),
        astVarRealnameMap: new Map(),
        funcExplRealnameMap: new Map(),
    };

    const visited = new Set<Formula>();
    // Used to track Formulas that we have encountered but haven't assigned a folder/root status yet.
    // They will eventually be classified as 'implicitRootFormulas' if not claimed by a folder or root.
    const unknownOwnership = new Set<Formula>();

    // 1. Process explicit roots
    for (const item of graph.root) {
        if (item instanceof Folder) {
            for (const child of item.children) {
                if (context.formulaToFolder.has(child)) {
                    throw new Error(`Formula is in multiple folders or appearing multiple times.`);
                }
                if (context.rootFormulas.has(child)) {
                    throw new Error(`Formula cannot be both a root item and inside a folder.`);
                }
                context.formulaToFolder.set(child, item);
                unknownOwnership.delete(child); // Claimed
                traverse(child, context, visited, unknownOwnership);
            }
        } else if (item instanceof Formula) {
            if (context.formulaToFolder.has(item)) {
                throw new Error(`Formula cannot be both a root item and inside a folder.`);
            }
            if (context.rootFormulas.has(item)) {
                throw new Error(`Formula appears multiple times in root.`);
            }
            context.rootFormulas.add(item);
            unknownOwnership.delete(item); // Claimed
            traverse(item, context, visited, unknownOwnership);
        }
    }

    // After traversal, any formula left in 'unknownOwnership' is an implicit root formula
    for (const f of unknownOwnership) {
        context.implicitRootFormulas.add(f);
    }

    // Step 1.5: Structural Validity Check (Final Acceptance)
    // Check for CtxVar Leakage
    const allRoots = [...context.rootFormulas, ...context.formulaToFolder.keys()];
    for (const root of allRoots) {
        const state = getState(root);
        // ctxValidity is computed at creation time
        if (!state.ctxValidity) {
            throw new Error(`Internal Error: CtxValidity state not found for formula ${root instanceof Expl ? root.id() : 'anonymous'}.`);
        }
        if (state.ctxValidity.missingCtxs.size > 0) {
            const missingNames = Array.from(state.ctxValidity.missingCtxs)
                .map(ctx => (ctx instanceof Expl ? ctx.id() : 'anonymous-ctx'))
                .join(', ');
            throw new Error(`CtxVar Leakage detected in formula ${root instanceof Expl ? root.id() : 'anonymous'}. Missing contexts: ${missingNames}`);
        }
    }

    return context;
};

const traverse = (
    formula: Formula,
    context: CompileContext,
    visited: Set<Formula>,
    unknownOwnership: Set<Formula>
) => {
    if (visited.has(formula)) return;
    visited.add(formula);

    // CtxVar:
    // Not engaged in records.
    // Only collect forced realnames.
    if (formula.type === 'context-variable') { // FormulaType.ContextVariable
        const ctxVar = formula as CtxVar;
        const realname = ctxVar.realname();
        if (typeof realname === 'string' && realname !== '') {
            const nName = normalizeName2(realname);
            ctxVar.realname(nName);
            context.ctxVarForceRealnameSet.add(nName);
        }
        return;
    }

    // If this formula was not claimed by root or folder (i.e. we reached it via dependency),
    // and it is NOT in rootFormulas or formulaToFolder map, then it is currently "unknown".
    if (!context.rootFormulas.has(formula) && !context.formulaToFolder.has(formula)) {
        unknownOwnership.add(formula);
    }

    // Register ID if it is an Expl
    if (formula instanceof Expl) {
        const id = formula.id();
        if (typeof id !== 'string' || id === '') {
            // In creation form, auto-ID should be generated. Empty ID is invalid at compile time.
            throw new Error(`Formula found with empty ID during compilation.`);
        }

        if (context.idMap.has(id)) {
            const existing = context.idMap.get(id);
            if (existing !== formula) {
                throw new Error(`ID Collision detected: '${id}'.`);
            }
        }
        context.idMap.set(id, formula);
    }

    // Recurse on dependencies
    for (const dep of formula.deps) {
        if (dep instanceof Formula) {
            traverse(dep, context, visited, unknownOwnership);
        }
    }

    // CtxExp additional:
    // Its deps is only deps of the header.
    // We need to traverse its body manually.
    // Also, manually visit its ctxVars to ensure in case its body didn't depend all of them.
    if ('ctxKind' in formula) { // Is CtxExp
        const ctxExp = formula as CtxExp;
        for (const cv of ctxExp.ctxVars) {
            traverse(cv, context, visited, unknownOwnership);
        }
        if (ctxExp.body instanceof Formula) {
            traverse(ctxExp.body, context, visited, unknownOwnership);
        }
    }
};
