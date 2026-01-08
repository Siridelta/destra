import { FormulaVisitor } from "./base-visitor";
import { getCtxNodeCtxVars, isCtxClause, isPointExp, isVarIR, scanUdRsVarRefs } from "./helpers";
import { reservedVars } from "../../syntax-reference/reservedWords";
import { maybeFuncDefIRNode } from "./atomic-exps";
import { traverse } from "./helpers";
import { TopLevelASTNode } from "./top-level";


declare module './base-visitor' {
    interface FormulaVisitor {
        formula(ctx: any): any;
        inLevel(ctx: any): any;
        sliderDef(ctx: any): any;
        topLevel(ctx: any): any;
    }
}

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

FormulaVisitor.prototype.formula = function (ctx: any) {
    const { content, slider } = this.visit(ctx.inLevel);
    return {
        type: "formula",
        content,
        slider,
    }
}

FormulaVisitor.prototype.inLevel = function (ctx: any) {
    const topLevel = this.visit(ctx.topLevel);
    const slider = ctx.sliderDef ? this.visit(ctx.sliderDef) : null;
    return {
        content: topLevel,
        slider,
    }
}

FormulaVisitor.prototype.sliderDef = function (ctx: any) {
    const terms = this.batchVisit(ctx.term);

    let i = 0;
    let from = null;
    let to = null;
    let step = null;

    // check 'from' term
    if (terms[i].type) {
        from = terms[i];
        i++;
    }
    i++;

    // check 'to' term or 'step' term
    if (i < terms.length && terms[i].type) {
        if (i + 1 < terms.length) {  // lookahead, if there's anything following, it's 'step' term
            step = terms[i + 1];
        } else {                     // else it's 'to' term
            to = terms[i];
        }
        i++;
    }
    i++;

    // check remaining 'to' term
    if (i < terms.length && terms[i].type) {
        to = terms[i];
    }

    return {
        type: "sliderConfig",
        from,
        to,
        step,
    }
}