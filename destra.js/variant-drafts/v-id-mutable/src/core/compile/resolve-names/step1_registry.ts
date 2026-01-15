import { CtxExp, CtxVar, Dt, Expl, Expression, Formula, Regression, RegrParam } from "../../formula/base";
import { isNoAst } from "../../formula/no-ast";
import { Label } from "../../formula/label";
import { normalizeName2 } from "../../formula/realname";
import { getState } from "../../state";
import { CompileContext, Folder, Graph, TickerAction } from "../types";

export const registryAndCollisionCheck = (graph: Graph): CompileContext => {
    const context: CompileContext = {
        // Step 1 Output
        idMap: new Map(),
        // 4 tables: formula -> folder, formula -> root, formula -> implicit root, formula -> background
        formulaToFolder: new Map(),
        rootFormulas: new Set(),
        implicitRootFormulas: new Set(),
        backgroundFormulas: new Set(),
        regrParams: new Set(),
        labels: new Set(),
        ctxVarForceRealnameSet: new Set(),

        // Step 2 Output
        globalRealnameMap: new Map(),
        globalUsedNames: new Set(),

        // Step 3 Output
        ctxVarRealnameMap: new Map(),
        internalCtxVarRealnameMap: new Map(),
        undefinedVarRealnameMap: new Map(),
        topoSort: [],
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
    const notFromRoot: Set<any> = new Set();
    if (graph.ticker?.handler) {
        if (graph.ticker.handler instanceof Formula) {
            notFromRoot.add(graph.ticker.handler);
        } else if (graph.ticker.handler instanceof TickerAction) {
            notFromRoot.add(graph.ticker.handler.action);
        }
    }
    if (graph.settings?.viewport?.xmin) notFromRoot.add(graph.settings.viewport.xmin);
    if (graph.settings?.viewport?.xmax) notFromRoot.add(graph.settings.viewport.xmax);
    if (graph.settings?.viewport?.ymin) notFromRoot.add(graph.settings.viewport.ymin);
    if (graph.settings?.viewport?.ymax) notFromRoot.add(graph.settings.viewport.ymax);
    for (const f of notFromRoot) {
        if (!(f instanceof Formula)) continue;
        if (!context.rootFormulas.has(f) && !context.formulaToFolder.has(f)) {
            unknownOwnership.add(f);
        }
        traverse(f, context, visited, unknownOwnership);
    }

    const allEntries = [...context.rootFormulas, ...context.formulaToFolder.keys(), ...context.implicitRootFormulas];

    // After traversal, any Expl left in 'unknownOwnership' is an implicit root formula
    // Any Expression left in 'unknownOwnership' is a background formula
    for (const f of unknownOwnership) {
        if (f instanceof Expl) {
            context.implicitRootFormulas.add(f);
        } else {
            context.backgroundFormulas.add(f);
        }
    }

    // Move all RegrParams to Regression Parameters
    for (const f of allEntries) {
        if (f instanceof RegrParam) {
            context.regrParams.add(f);
            context.implicitRootFormulas.delete(f);
            context.rootFormulas.delete(f);
            context.formulaToFolder.delete(f);
        }
    }

    // Step 1.5: Structural Validity Check (Final Acceptance)
    // Check for CtxVar Leakage
    for (const root of allEntries) {
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

    // Step 1.6: Regression Parameter Check
    const allRegrs = context.regrParams;
    const regrToRegression = new Map<RegrParam, Regression>();
    for (const f of Array.from(visited)) {
        if (f instanceof Regression) {
            const regrs = [
                ...f.deps.filter(dep => dep instanceof RegrParam),
                ...Object.values(f.regrParams),
            ];
            for (const regr of regrs) {
                if (regrToRegression.has(regr)) {
                    throw new Error(`Regression Parameter ${regr.id()} is defined in multiple Regressions.`);
                }
                regrToRegression.set(regr, f);
            }
        }
    }
    const undefinedRegrs = allRegrs.difference(new Set(regrToRegression.keys()));
    if (undefinedRegrs.size > 0) {
        throw new Error(`Regression Parameter ${Array.from(undefinedRegrs).map(regr => regr.id()).join(', ')} is not defined in any Regression.`);
    }

    // Step 1.7: Dt Check
    const tickerTree: Set<Formula> = new Set();
    const collectTickerTree = (formula: Formula) => {
        if (tickerTree.has(formula)) return;
        tickerTree.add(formula);
        for (const dep of formula.deps) {
            if (dep instanceof Expression) {
                collectTickerTree(dep);
            }
        }
    };
    if (graph.ticker?.handler instanceof Formula) {
        collectTickerTree(graph.ticker.handler);
    } else if (graph.ticker?.handler instanceof TickerAction) {
        collectTickerTree(graph.ticker.handler.action);
    }
    const checkDtRelated = (f: Formula) => {
        if (f instanceof Dt)
            throw new Error(`Dt cannot be used outside of ticker action.`);
        if (!tickerTree.has(f))
            for (const dep of f.deps)
                if (dep instanceof Dt)
                    throw new Error(`Dt cannot be used outside of ticker action.`);
    }
    for (const f of context.rootFormulas)
        checkDtRelated(f);
    for (const f of context.formulaToFolder.keys())
        checkDtRelated(f);
    for (const f of context.implicitRootFormulas)
        checkDtRelated(f);
    for (const f of context.backgroundFormulas)
        checkDtRelated(f);


    return context;
};

const traverse = (
    formula: Formula,
    context: CompileContext,
    visited: Set<Formula>,
    unknownOwnership: Set<Formula>,
) => {
    if (formula instanceof Dt) return;
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

    // Register ID if it is an Expl
    if (formula instanceof Expl) {
        const id = formula.id();
        if (typeof id !== 'string' || id === '') {
            // In creation form, auto-ID should be generated. Empty ID is invalid at compile time.
            throw new Error(
                `Formula found with empty ID during compilation.`
                + `Formula: ${formula['_content']}`
            );
        }

        if (context.idMap.has(id)) {
            const existing = context.idMap.get(id);
            if (existing !== formula) {
                throw new Error(`ID Collision detected: '${id}'.`);
            }
        }
        context.idMap.set(id, formula);
    }

    // RegrParam:
    // Not engaged in records.
    if (formula instanceof RegrParam) {
        const regrParam = formula as RegrParam;
        context.regrParams.add(regrParam);
        return;
    }
    if (isNoAst(formula)) {
        return;
    }

    // If this formula was not claimed by root or folder (i.e. we reached it via dependency),
    // and it is NOT in rootFormulas or formulaToFolder map, then it is currently "unknown".
    if (!context.rootFormulas.has(formula) && !context.formulaToFolder.has(formula)) {
        unknownOwnership.add(formula);
    }

    // Recurse on dependencies
    for (const dep of formula.deps) {
        if (dep instanceof Formula) {
            traverse(dep, context, visited, unknownOwnership);
        }
    }
    // visit Regression produced RegrParams
    if (formula instanceof Regression) {
        for (const regrParam of Object.values(formula.regrParams)) {
            traverse(regrParam, context, visited, unknownOwnership);
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

    // Scan the style tree and collect all formulas that are used as style values
    const styleValueFormulas = getStyleValueFormulas(formula);
    for (const sv of styleValueFormulas) {
        if (!context.rootFormulas.has(sv) && !context.formulaToFolder.has(sv)) {
            unknownOwnership.add(sv);
        }
    }
    const label = formula.styleData.label;
    if (label instanceof Label) {
        context.labels.add(label);
    }
};

// Scan the style tree and collect all formulas that are used as style values
export const getStyleValueFormulas = (formula: Formula) => {
    const styleValueFormulas = new Set<Formula>();
    const styleTree = formula.styleData;
    const traverse = (field: any) => {
        if (field instanceof Formula) {
            styleValueFormulas.add(field);
        } else if (typeof field === 'object' && field !== null) {
            for (const key in field) {
                traverse(field[key]);
            }
        }
    };
    traverse(styleTree);
    return styleValueFormulas;
};