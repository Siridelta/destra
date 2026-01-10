
import { isCtxClause, traceASTState } from "../../expr-dsl/parse-ast/sematics/helpers";
import { getASTChildren } from "../../expr-dsl/parse-ast/sematics/traverse-ast";
import { reservedVars } from "../../expr-dsl/syntax-reference/reservedWords";
import { CtxVar, Expression, Formula, isCtxExp, isFuncExpl } from "../../formula/base";
import { getState } from "../../state";
import {
    BaseScopeNode,
    CompileContext,
    CtxExpScopeNode,
    CtxNameResolutionState,
    FuncExplScopeNode, InternalClauseScopeNode,
    RootScopeNode,
    ScopeNode
} from "../types";
import { makeSuffixed } from "./step2_globalRealname";

let scopeIdCounter = 0;
type ScopeNodeBase = Omit<BaseScopeNode, 'id' | 'children' | 'parents' | 'definedVars' | 'forbiddenNames' | 'usedNames' | 'upstreamForcedNames' | 'forcedNames'>;
const createScopeNode = (base: ScopeNodeBase): ScopeNode => {
    return {
        id: `scope_${scopeIdCounter++}`,
        children: new Set(),
        parents: new Set(),
        definedVars: new Map(),
        forbiddenNames: new Set(),
        usedNames: new Set(),
        upstreamForcedNames: new Set(),
        forcedNames: new Set(),
        ...base
    } as ScopeNode;
};

// ============================================================================
// Main Logic
// ============================================================================

export const ctxRealnameResolution = (context: CompileContext) => {

    // 1. Initialize State
    const allFormulas = new Set<Formula>();

    const getResState = (f: Formula): CtxNameResolutionState => {
        const state = getState(f);
        state.compile ??= {};
        state.compile.ctxNameResolution ??= {
            inDegree: 0,
            users: new Set(),
            closestScopes: new Set(),
            overrideOutputClosestScopes: new WeakMap()
        };
        return state.compile.ctxNameResolution;
    };

    const visited = new Set<Formula>();
    const queue = [...context.rootFormulas, ...context.formulaToFolder.keys()];

    // BFS to find all formulas and build Users graph
    while (queue.length > 0) {
        const f = queue.shift()!;
        if (visited.has(f)) continue;
        visited.add(f);
        allFormulas.add(f);

        getResState(f); // init

        for (const dep of f.deps) {
            if (dep instanceof Formula) {
                const depState = getResState(dep);
                depState.inDegree++;
                depState.users.add(f);
                queue.push(dep);
            }
        }

        if (isCtxExp(f)) {
            if (f.body instanceof Formula) {
                const bodyState = getResState(f.body);
                bodyState.inDegree++;
                bodyState.users.add(f);
                queue.push(f.body);
            }
        }
    }

    // 2. Reverse Topological Sort (User before Dependency)
    const topoQueue: Formula[] = [];
    const topoRoots: Formula[] = [];     // Used for later resolution, is topologically root, inDegree = 0
    for (const f of allFormulas) {
        const state = getResState(f);
        if (state.inDegree === 0) {
            topoQueue.push(f);
            topoRoots.push(f);
        }
    }

    const rtSeriesFormula: Formula[] = [];

    while (topoQueue.length > 0) {
        const f = topoQueue.shift()!;
        rtSeriesFormula.push(f);

        const processDep = (dep: Formula) => {
            const depState = getResState(dep);
            depState.inDegree--;
            if (depState.inDegree === 0) {
                topoQueue.push(dep);
            }
        };

        for (const dep of f.deps) {
            if (dep instanceof Formula) processDep(dep);
        }
        if (isCtxExp(f)) {
            if (f.body instanceof Formula) {
                processDep(f.body);
            }
        }
    }

    // 3. Scope Propagation & DAG Construction

    const rootScope = createScopeNode({ type: "Root" }) as RootScopeNode;
    const rtSeriesScopeNode: ScopeNode[] = [rootScope];

    for (const f of topoRoots) {
        const state = getResState(f);
        state.closestScopes.add(rootScope);
    }

    for (const f of rtSeriesFormula) {
        const state = getResState(f);

        // Propagate closestScopes from users
        if (state.closestScopes.size === 0 && state.users.size > 0) {
            for (const user of state.users) {
                const userState = getResState(user);
                let output = userState.overrideOutputClosestScopes.get(f);
                if (!output) {
                    output = userState.closestScopes;
                }
                for (const s of output)
                    state.closestScopes.add(s);
            }
        }

        if (state.closestScopes.size === 0) {
            // Maybe a 'reset' happens, connect it to root scope
            state.closestScopes.add(rootScope);
        }

        let traverseInitialScopes = new Set<ScopeNode>();
        // Additional Logic for CtxExp
        if (isCtxExp(f)) {
            const scopeNode = createScopeNode({ type: "CtxExpScope", context: f }) as CtxExpScopeNode;
            rtSeriesScopeNode.push(scopeNode);

            for (const p of state.closestScopes) {
                scopeNode.parents.add(p);
                p.children.add(scopeNode);
            }

            const newScopeSet = new Set([scopeNode]);
            traverseInitialScopes = new Set([scopeNode]);
            if (f.body instanceof Formula)
                state.overrideOutputClosestScopes.set(f.body, newScopeSet);
        }
        // Additional Logic for FuncExpl
        else if (isFuncExpl(f)) {
            const scopeNode = createScopeNode({ type: "FuncExplScope", context: f }) as FuncExplScopeNode;
            rtSeriesScopeNode.push(scopeNode);

            for (const p of state.closestScopes) {
                scopeNode.parents.add(p);
                p.children.add(scopeNode);
            }

            traverseInitialScopes = new Set([scopeNode]);
        }
        // Logic for Internal AST
        const formulaState = getState(f);
        if (formulaState?.ast?.root) {
            traverseAST(formulaState.ast.root, traverseInitialScopes, f, state, rtSeriesScopeNode);
        }
    }

    // 4. Resolution Phase
    // Iterate Scope Nodes in Topological Order (Parent -> Child)

    // First initialize forbidden names for root scope
    for (const name of context.globalUsedNames)
        rootScope.forbiddenNames.add(name);
    for (const name of reservedVars)
        rootScope.forbiddenNames.delete(name);    
        // reserved vars are conditionally allowed, 
        // We tackle themwith the 'forbiddenNames' fields kept tracked everywhere

    for (const scope of rtSeriesScopeNode) {
        // Aggregate constraints
        for (const parent of scope.parents) {
            // Inherit forbidden and used
            for (const name of parent.forbiddenNames) scope.forbiddenNames.add(name);
            for (const name of parent.usedNames) scope.forbiddenNames.add(name);
            for (const name of parent.upstreamForcedNames) scope.upstreamForcedNames.add(name);
            for (const name of parent.forcedNames) scope.forcedNames.add(name);
        }

        // Assign names
        if (scope.type === 'Root') continue;

        const varsToResolve: { originalName: string, entity: any, forcedName?: string }[] = [];

        if (scope.type === 'CtxExpScope') {
            for (const cv of scope.context.ctxVars) {
                const cvState = getState(cv);
                varsToResolve.push({
                    originalName: cv.name,
                    entity: cv,
                    forcedName: cvState.ctxVar?.realname
                });
            }

            scope.forbiddenNames = scope.forbiddenNames.union(new Set(traceASTState(scope.context).forbiddenNames));

        } else if (scope.type === 'FuncExplScope') {
            for (let i = 0; i < scope.context.params.length; i++) {
                const param = scope.context.params[i];
                varsToResolve.push({
                    originalName: param,
                    entity: {
                        funcExpl: scope.context,
                        paramIndex: i
                    },
                });
            }

            scope.forbiddenNames = scope.forbiddenNames.union(new Set(traceASTState(scope.context).forbiddenNames));

        } else if (scope.type === 'InternalClauseScope') {
            const ctx = scope.context;
            if (ctx.type === 'forClause' || ctx.type === 'withClause') {
                for (const def of ctx.ctxVarDefs) {
                    varsToResolve.push({ originalName: def.name, entity: def });
                }
            } else {
                varsToResolve.push({ originalName: ctx.ctxVarDef.name, entity: ctx.ctxVarDef });
            }

            scope.forbiddenNames = scope.forbiddenNames.union(new Set(ctx.forbiddenNames));

        }

        for (const v of varsToResolve) {
            let finalName = v.originalName;

            if (v.forcedName) {
                // Prevent conflict with upstream forced names, and add to forcedNames
                if (scope.upstreamForcedNames.has(v.forcedName)) {
                    throw new Error(
                        `Cannot use forced context variable name ${v.forcedName}, because it's already set in upstream scopes`
                    );
                }
                scope.forcedNames.add(v.forcedName);
                finalName = v.forcedName;
            } else {
                let counter = 1;
                let triedName = finalName;

                const isConflict = (n: string) =>
                    scope.forbiddenNames.has(n) || scope.usedNames.has(n);

                while (isConflict(triedName)) {
                    counter++;
                    triedName = makeSuffixed(finalName, counter);
                }
                finalName = triedName;
            }

            scope.definedVars.set(v.originalName, finalName);
            scope.usedNames.add(finalName);

            if (v.entity instanceof CtxVar) {
                context.ctxVarRealnameMap.set(v.entity, finalName);
            } else if (v.entity.funcExpl) {
                const funcExpl = v.entity.funcExpl;
                const map = context.funcExplRealnameMap;
                let realnames = map.get(funcExpl);
                if (!realnames) {
                    realnames = new Map();
                    map.set(funcExpl, realnames);
                }
                realnames.set(v.entity.paramIndex, finalName);
            } else if (scope.type === 'InternalClauseScope') {
                context.astVarRealnameMap.set(v.entity, finalName);
            }
        }
    }
};

function traverseAST(
    node: any,
    currentScopes: Set<ScopeNode>,
    f: Formula,
    fState: CtxNameResolutionState,
    scopeList: ScopeNode[]
) {
    const _traverse = (node: any, currentScopes: Set<ScopeNode>) => {
        if (!node) throw new Error('Internal error: AST node is undefined in traverseAST');

        if (isCtxClause(node) && node.type !== 'functionDefinition') {
            const scopeNode = createScopeNode({
                type: "InternalClauseScope",
                context: node,
                host: f
            }) as InternalClauseScopeNode;
            scopeList.push(scopeNode);

            for (const p of currentScopes) {
                scopeNode.parents.add(p);
                p.children.add(scopeNode);
            }

            const newScopes = new Set([scopeNode]);

            // Recurse content with new scope
            _traverse(node.content, newScopes);

            // Recurse other parts (lower/upper limits) with OLD scope
            if (
                node.type === 'sumClause'
                || node.type === 'prodClause'
                || node.type === 'intClause'
            ) {
                _traverse(node.ctxVarDef.lower, currentScopes);
                _traverse(node.ctxVarDef.upper, currentScopes);
            }
            if (
                node.type === 'forClause'
                || node.type === 'withClause'
            ) {
                // for/with definitions expressions
                for (const def of node.ctxVarDefs) {
                    _traverse(def.expr, currentScopes);
                }
            }
            return;
        }

        // Check substitution to propagate
        if (node.type === 'substitution') {
            const index = node.index;
            if (index >= 0 && index < f.template.values.length) {
                const val = f.template.values[index];
                if (val instanceof Formula && currentScopes.size > 0) {
                    // Propagate!
                    fState.overrideOutputClosestScopes.set(val, new Set(currentScopes));
                }
            }
        }

        for (const child of getASTChildren(node)) {
            // A special escape case:
            // On calls to FuncExpl (DefinedFuncCallASTNoed) that leads to FuncExpl substitution, scopes resets.
            if (node.type === 'definedFuncCall' && child.type === 'substitution') {
                _traverse(child, new Set([]));
            } else {
                _traverse(child, currentScopes);
            }
        }
    }
    _traverse(node, currentScopes);
}
