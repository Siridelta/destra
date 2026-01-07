import { formulaParser } from "../parsing/parser";
import { TopLevelASTNode } from "./top-level";

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

    batchVisit(ctx: any[]): any[] {
        if (!Array.isArray(ctx)) {
            throw new Error("Internal error: batchVisit should be called with an array.");
        }
        return ctx.map((c: any) => {
            if (c.name) {  // is CST
                return this.visit(c);
            }
            if (c.tokenType) {
                return c;
            }
            throw new Error(`Internal error: Invalid item in batchVisit: unexpected item type ${typeof c}.`);
        });
    }

    formula(ctx: any) {
        const { content, slider } = this.visit(ctx.inLevel);
        return {
            type: "formula",
            content,
            slider,
        }
    }

    inLevel(ctx: any) {
        const topLevel = this.visit(ctx.topLevel);
        const slider = ctx.sliderDef ? this.visit(ctx.sliderDef) : null;
        return {
            content: topLevel,
            slider,
        }
    }

    sliderDef(ctx: any) {
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
}