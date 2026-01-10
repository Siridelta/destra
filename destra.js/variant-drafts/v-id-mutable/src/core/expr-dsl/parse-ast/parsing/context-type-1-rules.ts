import { DiffKeyword, ForKeyword, IntKeyword, ProdKeyword, SumKeyword, WithKeyword } from "../tokens/keywords";
import { Comma, Equal, Minus, ParenthesisClose, ParenthesisOpen, Plus } from "../tokens/op-and-puncs";
import { CustomIdentifier } from "../tokens/others";
import { ReservedVar } from "../tokens/reserved-words/reservedVars";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        context_type1: any;
        sum: any;
        prod: any;
        int: any;
        diff: any;
    }
}

export function initContextType1Rules(this: FormulaParser) {

    // context type 1: sum, prod, int, diff
    this.context_type1 = this.RULE("context_type1", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.sum) },
            { ALT: () => this.SUBRULE(this.prod) },
            { ALT: () => this.SUBRULE(this.int) },
            { ALT: () => this.SUBRULE(this.diff) },
        ]);
    });

    // sum(var=lower, upper) expr
    this.sum = this.RULE("sum", () => {
        this.CONSUME(SumKeyword);
        this.CONSUME(ParenthesisOpen);
        this.SUBRULE(this.ctxVarInDef, { LABEL: "ctxVar" });
        this.CONSUME(Equal);
        this.SUBRULE(this.addSubLevel, { LABEL: "lower" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.addSubLevel, { LABEL: "upper" });
        this.CONSUME(ParenthesisClose);
        this.SUBRULE(this.multDivLevel, { LABEL: "content" });
    });

    // prod(var=lower, upper) expr
    this.prod = this.RULE("prod", () => {
        this.CONSUME(ProdKeyword);
        this.CONSUME(ParenthesisOpen);
        this.SUBRULE(this.ctxVarInDef, { LABEL: "ctxVar" });
        this.CONSUME(Equal);
        this.SUBRULE(this.addSubLevel, { LABEL: "lower" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.addSubLevel, { LABEL: "upper" });
        this.CONSUME(ParenthesisClose);
        this.SUBRULE(this.multDivLevel, { LABEL: "content" });
    });

    // int(lower, upper) expr dx
    // int(lower, upper) dx expr
    this.int = this.RULE("int", () => {
        this.CONSUME(IntKeyword);
        this.CONSUME(ParenthesisOpen);
        this.SUBRULE(this.addSubLevel, { LABEL: "lower" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.addSubLevel, { LABEL: "upper" });
        this.CONSUME(ParenthesisClose);
        this.SUBRULE(this.multDivLevel, { LABEL: "content" });
    });

    // d/dVar expr
    this.diff = this.RULE("diff", () => {
        this.CONSUME(DiffKeyword);
        this.SUBRULE(this.ctxVarInDef, { LABEL: "ctxVar" });
        this.SUBRULE(this.multDivLevel, { LABEL: "content" });
    });

}