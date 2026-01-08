import { Comma, Equal, RangeDots, BracketOpen, BracketClose } from "../tokens/op-and-puncs";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        ctxFactoryExprDefHead: any;
        ctxFactoryRangeDefHead: any;
        ctxFactoryNullDefHead: any;
    }
}

export function initCtxHeaderRules(this: FormulaParser) {
    // var1 = expr1, var2 = expr2
    this.ctxFactoryExprDefHead = this.RULE("ctxFactoryExprDefHead", () => {
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => {
                this.SUBRULE(this.ctxVarInDef, { LABEL: "ctxVar" });
                this.CONSUME(Equal);
                this.SUBRULE(this.actionLevel, { LABEL: "value" });
            },
        });
    });

    // var = lower, upper
    this.ctxFactoryRangeDefHead = this.RULE("ctxFactoryRangeDefHead", () => {
        this.SUBRULE(this.ctxVarInDef, { LABEL: "ctxVar" });
        this.CONSUME(Equal);
        this.SUBRULE(this.addSubLevel, { LABEL: "lower" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.addSubLevel, { LABEL: "upper" });
    });

    // x, y, z
    this.ctxFactoryNullDefHead = this.RULE("ctxFactoryNullDefHead", () => {
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => {
                this.SUBRULE(this.ctxVarInDef, { LABEL: "ctxVar" });
            },
        });
    });
}
