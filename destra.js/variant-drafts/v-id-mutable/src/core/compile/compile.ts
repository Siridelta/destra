import { CtxFactoryHeadASTNode, FormulaASTNode } from "../expr-dsl/parse-ast";
import { Expression, Formula, VarExpl, Image } from "../formula/base";
import { ActionStyleValue, ColorStyleValue, isPointPrimitiveStyleValue, LabelTextValue, NumericStyleValue, PointStyleValue } from "../formula/style";
import { getState } from "../state";
import { isNoAst } from "../formula/types";
import { ASTParenAdder } from "./ast-normalize/add-parens";
import { ASTCloner } from "./ast-normalize/clone";
import { ASTExpander, numberToAST } from "./ast-normalize/expand";
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
        export(config?: exportConfig): any;
    }
}

export interface exportConfig {
    version?: number;
}
const defaultExportConfig: exportConfig = {
    version: 10,
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

export function numberToLatex(value: number | number[]): string {
    let ast: any | null = null;
    if (Array.isArray(value)) {
        ast = {
            type: 'listExp',
            items: value.map(v => numberToAST(v)),
        }
    }
    else
        ast = numberToAST(value);
    // @ts-ignore
    return new LatexCompiler().visit(ast);
}
function pointPrimitiveToLatex(value: [number, number] | [number, number][]) {
    let ast: any | null = null;
    const singlePointToAST = (point: [number, number]) => {
        return {
            type: 'tupleExp',
            items: [numberToAST(point[0]), numberToAST(point[1])],
        }
    }
    if (value.every(p => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number'))) {
        ast = {
            type: 'listExp',
            items: (value as [number, number][]).map(p => singlePointToAST(p)),
        }
    }
    else
        ast = singlePointToAST(value as [number, number]);
    // @ts-ignore
    return new LatexCompiler().visit(ast);
}
export function numericToLatex(value: NumericStyleValue | undefined, ctx: CompileContext) {
    if (!value) return undefined;
    if (typeof value === 'number' || (Array.isArray(value) && value.every(v => typeof v === 'number'))) {
        return numberToLatex(value);
    }
    if (typeof value === 'string') {
        return value;
    }
    value = value as Expression | VarExpl;
    return compileFormula(value, ctx).latex;
}
function pointToLatex(value: PointStyleValue | undefined, ctx: CompileContext) {
    if (!value) return undefined;
    if (isPointPrimitiveStyleValue(value)) {
        return pointPrimitiveToLatex(value);
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

const buildDesmosExpressionState = (f: Formula, ctx: CompileContext, id: string, folderId?: string) => {
    const result = compileFormula(f, ctx);
    const style = f.styleData;
    const desmosExpression: any = {
        type: 'expression',
        id: id,
        latex: result.latex,

        folderId: folderId,

        slider: result.slider ? {
            hardMin: result.slider.min ? true : undefined,
            hardMax: result.slider.max ? true : undefined,
            min: result.slider.min,
            max: result.slider.max,
            step: result.slider.step,
            isPlaying: style.slider?.playing,
            animationPeriod: style.slider?.speed ? 4000 / style.slider.speed : undefined,
            loopMode: style.slider?.loopMode,
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
const buildDesmosImageState = (image: Image, ctx: CompileContext, id: string, folderId?: string) => {
    return {
        type: 'image',
        id: id,
        folderId: folderId,
        image_url: image.url,
        name: image.name,
        center: pointToLatex(image.options.center, ctx),
        width: numericToLatex(image.options.width, ctx),
        height: numericToLatex(image.options.height, ctx),
        angle: numericToLatex(image.options.angle, ctx),
        opacity: numericToLatex(image.options.opacity, ctx),
        dragMode: image.options.draggable,
        clickableInfo: (() => {
            const enabled =
                image.options.onClick !== undefined
                || image.options.hoverImage !== undefined
                || image.options.depressedImage !== undefined;
            if (!enabled) return undefined;
            return {
                enabled: enabled,
                latex: actionToLatex(image.options.onClick, ctx),
                hoverImage: image.options.hoverImage,
                depressedImage: image.options.depressedImage,
            };
        })(),
    };
}
const buildDesmosFormulaState = (f: Formula, ctx: CompileContext, id: string, folderId?: string) => {
    if (f instanceof Image) {
        return buildDesmosImageState(f, ctx, id, folderId);
    }
    return buildDesmosExpressionState(f, ctx, id, folderId);
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
        open: ticker.open ?? (ticker.handler ? true : undefined),
        playing: ticker.playing,
        secret: ticker.secret,
    };
}

const cleanUndefinedFields = (obj: any) => {
    for (const k in obj) {
        if (obj[k] === undefined) {
            delete obj[k];
        }
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            obj[k] = cleanUndefinedFields(obj[k]);
        }
    }
    return obj;
}

Graph.prototype.export = function (config?: exportConfig) {
    config = { ...defaultExportConfig, ...config };
    const ctx = resolveGraph(this);
    ctx.topoSort.forEach(f => {
        if (isNoAst(f)) return;
        normalizeAST(f, ctx);
        compileFormula(f, ctx);
    });

    const desmosFormulaList: any[] = [];

    let idCounter = 0;

    const implicitRootStates: any[] = [];
    if (this.destraSettings.implicitRootFolder) {
        desmosFormulaList.push(
            buildFolderState(
                this.destraSettings.implicitRootFolder.title,
                this.destraSettings.implicitRootFolder.id ?? (idCounter++).toString()
            )
        );
    }
    for (const f of ctx.implicitRootFormulas) {
        implicitRootStates.push(buildDesmosFormulaState(f, ctx, (idCounter++).toString()));
    }

    for (const f of ctx.rootFormulas) {
        if (f instanceof Folder) {
            const folderId = (idCounter++).toString();
            desmosFormulaList.push(buildFolderState(f.title, folderId));
            for (const child of f.children) {
                desmosFormulaList.push(buildDesmosFormulaState(child, ctx, (idCounter++).toString(), folderId));
            }
        }
        else {
            desmosFormulaList.push(buildDesmosFormulaState(f, ctx, (idCounter++).toString(), undefined));
        }
    }

    if (this.destraSettings.implicitRootPosition === 'TOP') {
        desmosFormulaList.unshift(...implicitRootStates);
    }
    else {
        desmosFormulaList.push(...implicitRootStates);
    }

    // state.graph
    const viewportField = this.settings?.viewport ? {
        xmin: this.settings?.viewport?.xmin ?? -10,
        xmax: this.settings?.viewport?.xmax ?? 10,
        ymin: this.settings?.viewport?.ymin,
        ymax: this.settings?.viewport?.ymax,
    } : undefined;
    const graphField = {
        complex: this.settings?.complex,
        polarMode: this.settings?.polarMode,
        showGrid: this.settings?.showGrid,
        showXAxis: this.settings?.showXAxis,
        showYAxis: this.settings?.showYAxis,
        squareAxes: this.settings?.squareAxes,
        userLockedViewport: this.settings?.userLockedViewport,
        // __v12ViewportLatexStash: viewportField,
        viewport: viewportField,
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

    return cleanUndefinedFields({
        version: config.version,
        graph: graphField,
        // Recall: Desmos used to call it 'expressions', but in destra for clarity we always call it 'formulas'.
        // here is where the concepts convert back.
        expressions: {
            list: desmosFormulaList,
            ticker: buildTickerState(this.ticker, ctx),
        }
    });

};