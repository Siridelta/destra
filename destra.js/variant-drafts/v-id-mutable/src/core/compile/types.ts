
import { CtxClauseASTNode } from "../expr-dsl/parse-ast";
import {
    CtxVarDefASTNode
} from "../expr-dsl/parse-ast/sematics/visitor-parts/addSub-level";
import { UndefinedVarASTNode } from "../expr-dsl/parse-ast/sematics/visitor-parts/terminals";
import { CtxExp, CtxVar, Dt, Expl, Expression, Formula, FuncExpl, RegrParam, VarExpl } from "../formula/base";
import { Label } from "../formula/label";
import { ActionStyleValue, NumericStyleValue } from "../formula/style";

// ============================================================================
// Graph Definitions
// ============================================================================

export interface FolderInput {
    title: string;
    children: Formula[];
    options?: {
        collapsed?: boolean;
        hidden?: boolean;
        id?: string;
    };
}

export class Folder {
    public readonly title: string;
    public readonly children: Formula[];
    public readonly options: {
        collapsed?: boolean;
        hidden?: boolean;
        id?: string;
    };

    constructor(input: FolderInput) {
        this.title = input.title;
        this.children = input.children;
        this.options = input.options || {};
    }
}

export interface GraphSettings {
    complex?: boolean;
    degreeMode?: boolean;
    polarMode?: boolean;
    showGrid?: boolean
    showXAxis?: boolean;
    showYAxis?: boolean;
    squareAxes?: boolean;
    userLockedViewport?: boolean;
    viewport?: {
        xmin: NumericStyleValue;
        xmax: NumericStyleValue;
        ymin: NumericStyleValue;
        ymax: NumericStyleValue;
    };
    // Note: Without script approaches a user can only have the two always the same value
    xAxisArrowMode?: "NONE" | "POSITIVE" | "BOTH";
    yAxisArrowMode?: "NONE" | "POSITIVE" | "BOTH";
    xAxisLabel?: string;
    yAxisLabel?: string;
    xAxisMinorSubdivisions?: number;
    yAxisMinorSubdivisions?: number;
    // Note: Without script approaches a user can only have the two always the same value
    xAxisNumbers?: boolean;
    yAxisNumbers?: boolean;
    xAxisScale?: 'logarithmic';
    yAxisScale?: 'logarithmic';
    xAxisStep?: number;
    yAxisStep?: number;

    randomSeed?: string;
}

export type RootItem = Formula | Folder;

export interface Ticker {
    minStep?: NumericStyleValue;
    handler?: ActionStyleValue | TickerAction;
    playing?: boolean;
    open?: boolean;
    secret?: boolean;
}

export class TickerAction {
    public readonly action: ActionStyleValue;
    public constructor(action: (dt: Dt) => ActionStyleValue) {
        this.action = action(new Dt());
    }
}

export interface DestraSettings {
    implicitRootPosition: "TOP" | "BOTTOM";
    implicitRootFolder?: {
        title: string;
        id?: string;
    };
}

export interface GraphInput {
    root: RootItem[];
    ticker?: Ticker;
    settings?: GraphSettings;
    destraSettings?: DestraSettings;
}

export class Graph {
    public readonly root: RootItem[];
    public readonly ticker?: Ticker;
    public readonly settings?: GraphSettings;
    public readonly destraSettings: DestraSettings;

    constructor(input: GraphInput) {
        this.root = input.root;
        this.ticker = input.ticker;
        this.settings = input.settings;
        this.destraSettings = {
            implicitRootPosition: "TOP",
            ...input.destraSettings
        };
    }
}


// ============================================================================
// Compilation Context
// ============================================================================

// export type RootASTNode = FormulaASTNode | TopLevelASTNode | CtxFactoryHeadASTNode | CtxClauseASTNode; // Simplified

export interface BaseScopeNode {
    id: string;
    children: Set<ScopeNode>; // Downstream scopes (inner)
    parents: Set<ScopeNode>;  // Upstream scopes (outer)
    
    // For resolution
    definedVars: Map<string, string>; // originalName -> assignedRealname
    forbiddenNames: Set<string>; // Names forbidden in this scope (from parents)
    usedNames: Set<string>;      // Names used in this scope (assigned)
    upstreamForcedNames: Set<string>; // Forced names existing in upstream scopes, used to detect errors.
    forcedNames: Set<string>; // Forced names in this scope
}

export interface RootScopeNode extends BaseScopeNode {
    type: "Root";
}

export interface CtxExpScopeNode extends BaseScopeNode {
    type: "CtxExpScope";
    context: CtxExp;
}

export interface FuncExplScopeNode extends BaseScopeNode {
    type: "FuncExplScope";
    context: FuncExpl<any>;
}

export interface InternalClauseScopeNode extends BaseScopeNode {
    type: "InternalClauseScope";
    context: CtxClauseASTNode;
    host: Formula;
}

export interface UdVarScopeNode extends BaseScopeNode {
    type: "UndefinedVar";
    context: UndefinedVarASTNode;
}

export type ScopeNode = RootScopeNode | CtxExpScopeNode | FuncExplScopeNode | InternalClauseScopeNode | UdVarScopeNode;


export interface CompileContext {
    // Step 1 Output
    idMap: Map<string, Expl>;            // ID -> Formula (Expl)
    formulaToFolder: Map<Formula, Folder>;  // Formula -> Folder
    rootFormulas: Set<Formula>;             // Explicit root formulas
    implicitRootFormulas: Set<Formula>;     // Implicit root formulas (dependencies)      (All unknown ownership Expls goes here)
    backgroundFormulas: Set<Formula>;        // Formulas that are completely inaccessible (All unknown ownership Exprs goes here)
    regrParams: Set<RegrParam>;              // Regression Parameters
    labels: Set<Label>;
    ctxVarForceRealnameSet: Set<string>;    // Collected forced realnames for CtxVars

    // Step 2 Output
    globalRealnameMap: Map<Formula, string>; // Formula -> Global Realname
    globalUsedNames: Set<string>;            // All used global names (including keywords)

    // Step 3 Output
    // scopeTree: ScopeTree;                 // Internal use in Step 3
    ctxVarRealnameMap: Map<CtxVar, string>;  // CtxVar -> Realname
    internalCtxVarRealnameMap: Map<string, string>; // Internal AST Node ID -> Realname
    funcExplCtxVarRealnameMap: Map<FuncExpl<any>, Map<number, string>>; // FuncExpl -> Realnames of params, by param index
    undefinedVarRealnameMap: Map<UndefinedVarASTNode, string>; // UndefinedVar -> Realname
    topoSort: Formula[];                     // Topological sort of formulas
}

// ============================================================================
// State Extensions
// ============================================================================

export interface CtxNameResolutionState {
    // For Step 3 topological sort and propagation
    inDegree: number;
    users: Set<Formula>;
    
    // For Step 3 Scope DAG construction
    closestScopes: Set<ScopeNode>; // Set<ScopeNode>
    overrideOutputClosestScopes: WeakMap<Formula, Set<ScopeNode>>; // Set<ScopeNode>
}

declare module "../state" {
    interface CompileState {
        ctxNameResolution?: CtxNameResolutionState;
    }
}
