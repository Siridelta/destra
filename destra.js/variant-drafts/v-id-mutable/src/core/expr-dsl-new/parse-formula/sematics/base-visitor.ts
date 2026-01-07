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