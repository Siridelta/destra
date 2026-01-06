import { CstNode } from "chevrotain";
import { formulaParser } from "../parsing/parser";
import { ExpressionASTNode, TopLevelASTNode } from "./top-level";

export const BaseFormulaVisitor = formulaParser.getBaseCstVisitorConstructor();

export interface FormulaASTNode {
    type: "formula",
    content: TopLevelASTNode,
    slider: SliderConfigASTNode | null,
}

export interface SliderConfigASTNode {
    type: "sliderConfig",
    from: any | null,
    to: any | null,
    step: any | null,
}

export class FormulaVisitor extends BaseFormulaVisitor {

    constructor() {
        super();
        this.validateVisitor();
    }

    formula(ctx: any) {
        const [{ content, slider }] = this.visit(ctx.inLevel);
        return {
            type: "formula",
            content,
            slider,
        }
    }

    inLevel(ctx: any) {
        const [topLevel] = this.visit(ctx.topLevel);
        const [slider] = ctx.slider ? this.visit(ctx.slider) : [null];
        return {
            content: topLevel,
            slider,
        }
    }

    sliderDef(ctx: any) {
        const [from] = ctx.from ? this.visit(ctx.from) : [null];
        const [to] = ctx.to ? this.visit(ctx.to) : [null];
        const [step] = ctx.step ? this.visit(ctx.step) : [null];
        return {
            type: "sliderConfig",
            from,
            to,
            step,
        }
    }
}

function _scanUdRsVarRefs(node: any) {
    const udVarRefs: Set<string> = new Set();
    const rsVarRefs: Set<string> = new Set();
    if (node['type'] && node['type'] === 'udVarRef') {
        udVarRefs.add(node.name);
    }
    if (node['type'] && node['type'] === 'rsVarRef') {
        rsVarRefs.add(node.name);
    }
    for(const [k, v] of Object.entries(node)) {
        if (typeof v === 'object' && v !== null) {
            const { udVarRefs: udVarRefs2, rsVarRefs: rsVarRefs2 } = _scanUdRsVarRefs(v);
            udVarRefs.union(udVarRefs2);
            rsVarRefs.union(rsVarRefs2);
        }
    }
    return { udVarRefs, rsVarRefs };
}

export function scanUdRsVarRefs(node: any) {
    const { udVarRefs, rsVarRefs } = _scanUdRsVarRefs(node);
    return { 
        udVarRefs: Array.from(udVarRefs), 
        rsVarRefs: Array.from(rsVarRefs) 
    };
}

export function getCtxNodeCtxVars(ctxNode: any) {
    const ctxVars: string[] = [];
    if (ctxNode['type'] && (
        ctxNode['type'] === 'forClause'
        || ctxNode['type'] === 'withClause'
    )) {
        ctxVars.push(...ctxNode.ctxVarDefs.map((d: any) => d.name));
    }
    if (ctxNode['type'] && (
        ctxNode['type'] === 'sumClause'
        || ctxNode['type'] === 'productClause'
        || ctxNode['type'] === 'intClause'
        || ctxNode['type'] === 'diffClause'
    )) {
        ctxVars.push(ctxNode.ctxVarDef.name);
    }
    return ctxVars;
}