import { CtxFactoryHeadASTNode, FormulaASTNode } from "../expr-dsl/parse-ast";
import { CtxVar, Formula } from "../formula/base";
import { ActionStyleValue, ColorStyleValue, LabelTextValue, NumericStyleValue } from "../formula/style";
import { getState } from "../state";
import { ASTParenAdder } from "./ast-normalize/add-parens";
import { ASTCloner } from "./ast-normalize/clone";
import { ASTExpander } from "./ast-normalize/expand";
import { MultDivArranger } from "./ast-normalize/multDiv-arrange";
import { compileLabel } from "./compileLabel";
import { LatexCompiler } from "./gen-latex";
import { registryAndCollisionCheck } from "./resolve-names/step1_registry";
import { globalRealnameResolution } from "./resolve-names/step2_globalRealname";
import { ctxRealnameResolution } from "./resolve-names/step3_ctxRealname";
import { CompileContext, Folder, Graph, Ticker, TickerAction } from "./types";

export { Folder, Graph, type FolderInput, type GraphInput, type GraphSettings, type Ticker } from "./types";

declare module './types' {
    interface Graph {
        export(): any;
    }
}

declare module '../state' {
    interface CompileState {
        normalizedAST?: FormulaASTNode | CtxFactoryHeadASTNode;
        compileResult?: CompileResult;
    }
}

export interface CompileResult {
    latex: string;
    slider: {
        max?: string;
        min?: string;
        step?: string;
    } | null;
}

/**
 * Resolve the graph: perform ID checks, global name resolution, and context variable resolution.
 * This covers Step 1 to Step 3 of the compilation process.
 */
export const resolveGraph = (graph: Graph) => {
    // Step 1: ID Registry & Collision Check
    const ctx = registryAndCollisionCheck(graph);

    // Step 2: Global Realname Resolution
    globalRealnameResolution(ctx);

    // Step 3: Context Variable Realname Resolution
    ctxRealnameResolution(ctx);

    return ctx;
};


function normalizeAST(f: Formula, ctx: CompileContext, force: boolean = false) {

    getState(f).compile ??= {};
    const maybeNormalizedAST = getState(f).compile!.normalizedAST;
    if (!force && maybeNormalizedAST) {
        return maybeNormalizedAST;
    }

    const ast = getState(f).ast!.root;
    const cloned = new ASTCloner().visit(ast);
    const expanded = new ASTExpander(f).visit(cloned);
    const rearranged = new MultDivArranger(ctx, f).visit(expanded);
    const parened = new ASTParenAdder(f).visit(rearranged);
    getState(f).compile!.normalizedAST = parened;

    return parened;
}

function compileFormula(f: Formula, ctx: CompileContext, force: boolean = false): CompileResult {

    getState(f).compile ??= {};
    const maybeCompileResult = getState(f).compile!.compileResult;
    if (!force && maybeCompileResult) {
        return maybeCompileResult;
    }

    const compileResult = new LatexCompiler(
        ctx, f,
        (f_dep) => compileFormula(f_dep, ctx),
        (f_ast) => normalizeAST(f_ast, ctx),
    ).compile();

    getState(f).compile!.compileResult = compileResult;

    return compileResult;
}

function numericToLatex(value: NumericStyleValue | undefined, ctx: CompileContext) {
    if (!value) return undefined;
    if (typeof value === 'number') {
        return value.toString();
    }
    if (typeof value === 'string') {
        return value;
    }
    return compileFormula(value, ctx).latex;
}

function colorToLatex(value: ColorStyleValue | undefined, ctx: CompileContext) {
    if (!value) return undefined;
    if (typeof value === 'string') {
        return value;
    }
    return compileFormula(value, ctx).latex;
}

function labelTextToLatex(value: LabelTextValue | undefined, ctx: CompileContext) {
    if (!value) return undefined;
    if (typeof value === 'string') {
        return value;
    }
    return compileLabel(value, ctx);
}

function actionToLatex(value: ActionStyleValue | TickerAction | undefined, ctx: CompileContext) {
    if (!value) return undefined;
    if (value instanceof TickerAction) {
        return compileFormula(value.action, ctx).latex;
    }
    if (typeof value === 'string') {
        return value;
    }
    return compileFormula(value, ctx).latex;
}

Graph.prototype.export = function () {
    const ctx = resolveGraph(this);
    ctx.topoSort.forEach(f => {
        if (f instanceof CtxVar) return;
        normalizeAST(f, ctx);
        compileFormula(f, ctx);
    });

    const desmosExpressionList: any[] = [];
    const buildDesmosExpressionState = (f: Formula, id: string, folderId?: string) => {
        const result = compileFormula(f, ctx);
        const style = f.styleData;
        const desmosExpression: any = {
            type: 'expression',
            id: id,
            latex: result.latex,

            folderId: folderId,

            sliderBounds: result.slider ? {
                min: result.slider.min,
                max: result.slider.max,
                step: result.slider.step,
            } : undefined,

            hidden: style.hidden,
            lines: style.showParts?.lines,
            points: style.showParts?.points,
            fill: style.showParts?.fill,

            showLabel: style.showParts?.label,
            color: colorToLatex(style.color, ctx),

            lineStyle: style.line?.style,
            lineWidth: numericToLatex(style.line?.width, ctx),
            lineOpacity: numericToLatex(style.line?.opacity, ctx),

            pointStyle: style.point?.style,
            pointSize: numericToLatex(style.point?.size, ctx),
            pointOpacity: numericToLatex(style.point?.opacity, ctx),
            dragMode: style.point?.dragMode,

            fillOpacity: numericToLatex(style.fill?.opacity, ctx),

            label: labelTextToLatex(style.label?.text, ctx),
            labelSize: numericToLatex(style.label?.size, ctx),
            labelOrientation: style.label?.orientation,
            labelAngle: numericToLatex(style.label?.angle, ctx),

            clickableInfo: style.click ? {
                enabled: style.click.enabled === null ? undefined : (style.click.enabled ?? true),
                latex: actionToLatex(style.click.handler, ctx),
            } : undefined,

            polarDomain: style.theta ? {
                min: numericToLatex(style.theta?.min, ctx),
                max: numericToLatex(style.theta?.max, ctx),
            } : undefined,
            paramtricDomain3Dphi: style.phi ? {
                min: numericToLatex(style.phi?.min, ctx),
                max: numericToLatex(style.phi?.max, ctx),
            } : undefined,
            parametricDomain: style.t ? {
                min: numericToLatex(style.t?.min, ctx),
                max: numericToLatex(style.t?.max, ctx),
            } : undefined,
            paramtricDomain3Du: style.u ? {
                min: numericToLatex(style.u?.min, ctx),
                max: numericToLatex(style.u?.max, ctx),
            } : undefined,
            paramtricDomain3Dv: style.v ? {
                min: numericToLatex(style.v?.min, ctx),
                max: numericToLatex(style.v?.max, ctx),
            } : undefined,
        };
        return desmosExpression;
    }
    const buildFolderState = (title: string, folderId: string) => {
        return {
            type: 'folder',
            id: folderId,
            title: title,
        };
    }
    const buildTickerState = (ticker: Ticker | undefined, ctx: CompileContext) => {
        if (!ticker) return undefined;
        return {
            handlerLatex: actionToLatex(ticker.handler, ctx),
            minStepLatex: numericToLatex(ticker.minStep, ctx),
            open: ticker.open,
            playing: ticker.playing,
            secret: ticker.secret,
        };
    }

    let idCounter = 0;

    const implicitRootStates: any[] = [];
    if (this.destraSettings.implicitRootFolder) {
        desmosExpressionList.push(
            buildFolderState(
                this.destraSettings.implicitRootFolder.title, 
                this.destraSettings.implicitRootFolder.id ?? (idCounter++).toString()
            )
        );
    }
    for (const f of ctx.implicitRootFormulas) {
        implicitRootStates.push(buildDesmosExpressionState(f, (idCounter++).toString()));
    }

    for (const f of this.root) {
        if (f instanceof Folder) {
            const folderId = (idCounter++).toString();
            desmosExpressionList.push(buildFolderState(f.title, folderId));
            for (const child of f.children) {
                desmosExpressionList.push(buildDesmosExpressionState(child, (idCounter++).toString(), folderId));
            }
        }
        else {
            desmosExpressionList.push(buildDesmosExpressionState(f, (idCounter++).toString(), undefined));
        }
    }

    if (this.destraSettings.implicitRootPosition === 'TOP') {
        desmosExpressionList.unshift(...implicitRootStates);
    }
    else {
        desmosExpressionList.push(...implicitRootStates);
    }

    // state.graph
    const graphField = {
        complex: this.settings?.complex,
        polarMode: this.settings?.polarMode,
        showGrid: this.settings?.showGrid,
        showXAxis: this.settings?.showXAxis,
        showYAxis: this.settings?.showYAxis,
        squareAxes: this.settings?.squareAxes,
        userLockedViewport: this.settings?.userLockedViewport,
        __v12ViewportLatexStash: this.settings?.viewport? {
            xmin: numericToLatex(this.settings?.viewport?.xmin, ctx),
            xmax: numericToLatex(this.settings?.viewport?.xmax, ctx),
            ymin: numericToLatex(this.settings?.viewport?.ymin, ctx),
            ymax: numericToLatex(this.settings?.viewport?.ymax, ctx),
        } : undefined,
        xAxisArrowMode: this.settings?.xAxisArrowMode,
        yAxisArrowMode: this.settings?.yAxisArrowMode,
        xAxisLabel: this.settings?.xAxisLabel,
        yAxisLabel: this.settings?.yAxisLabel,
        xAxisMinorSubdivisions: this.settings?.xAxisMinorSubdivisions,
        yAxisMinorSubdivisions: this.settings?.yAxisMinorSubdivisions,
        xAxisNumbers: this.settings?.xAxisNumbers,
        yAxisNumbers: this.settings?.yAxisNumbers,
        xAxisScale: this.settings?.xAxisScale,
        yAxisScale: this.settings?.yAxisScale,
        xAxisStep: this.settings?.xAxisStep,
        yAxisStep: this.settings?.yAxisStep,
        randomSeed: this.settings?.randomSeed,
    }

    return {
        graph: graphField,
        expressions: {
            list: desmosExpressionList,
            ticker: buildTickerState(this.ticker, ctx),
        }
    }

};