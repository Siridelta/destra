import { ExprDSLCSTVisitor } from "../base-visitor";
import { RsVarDepType } from "../helpers";
import { TopLevelASTNode } from "./top-level";


declare module '../base-visitor' {
    interface ExprDSLCSTVisitor {
        formula(ctx: any): any;
        inLevel(ctx: any): any;
        sliderDef(ctx: any): any;
    }
}

export interface FormulaASTNode {
    type: "formula",
    content: TopLevelASTNode,
    slider: SliderConfigASTNode | null,
    rsVarDepType: RsVarDepType | null,
    rsVars: string[],
}

export interface SliderConfigASTNode {
    type: "sliderConfig",
    min: any | null,
    max: any | null,
    step: any | null,
}

ExprDSLCSTVisitor.prototype.formula = function (ctx: any): FormulaASTNode {
    const { content, slider } = this.visit(ctx.inLevel) as { content: TopLevelASTNode, slider: SliderConfigASTNode | null };
    let rsVarDepType: RsVarDepType | null = null;
    let rsVars: string[] = [];
    if (
        content.type === "variableDefinition"
        || content.type === "functionDefinition"
        || content.type === "expression"
    ) {
        rsVarDepType = content.rsVarDepType;
        rsVars = content.rsVars;
    }
    return {
        type: "formula",
        content,
        slider,
        rsVarDepType,
        rsVars,
    }
}

ExprDSLCSTVisitor.prototype.inLevel = function (ctx: any) {
    const topLevel = this.visit(ctx.topLevel);
    const slider = ctx.sliderDef ? this.visit(ctx.sliderDef) : null;
    return {
        content: topLevel,
        slider,
    }
}

ExprDSLCSTVisitor.prototype.sliderDef = function (ctx: any) {
    const terms = this.batchVisit(ctx.term);

    let i = 0;
    let min = null;
    let max = null;
    let step = null;

    // check 'from' term
    if (terms[i].type) {
        min = terms[i];
        i++;
    }
    i++;

    // check 'to' term or 'step' term
    if (i < terms.length && terms[i].type) {
        if (i + 1 < terms.length) {  // lookahead, if there's anything following, it's 'step' term
            step = terms[i];
        } else {                     // else it's 'to' term
            max = terms[i];
        }
        i++;
    }
    i++;

    // check remaining 'to' term
    if (i < terms.length && terms[i].type) {
        max = terms[i];
    }

    return {
        type: "sliderConfig",
        min,
        max,
        step,
    }
}