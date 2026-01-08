import { DiffKeyword, ForKeyword, Int_dVarKeyword, IntKeyword, ProdKeyword, SumKeyword, WithKeyword } from "../tokens/keywords";
import { Comma, Equal, Minus, ParenthesisClose, ParenthesisOpen, Plus } from "../tokens/op-and-puncs";
import { CustomIdentifier } from "../tokens/others";
import { ReservedVar } from "../tokens/reserved-words/reservedVars";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        addSubLevel: any;
        contextLevel: any;
        context_type1: any;
        context_type2_level: any;
        sum: any;
        prod: any;
        int: any;
        diff: any;
        fromForKeyword: any;
        fromWithKeyword: any;
        ctxVarInDef: any;
    }
}

export function initAddSubRules(this: FormulaParser) {
    this.addSubLevel = this.RULE("addSubLevel", () => {
        this.SUBRULE(this.contextLevel, { LABEL: "lhs" });
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Plus, { LABEL: "operator" }) },
                { ALT: () => this.CONSUME(Minus, { LABEL: "operator" }) },
            ]);
            this.SUBRULE2(this.addSubLevel, { LABEL: "rhs" });
        });
    });

    this.contextLevel = this.RULE("contextLevel", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.context_type1) },
            { ALT: () => this.SUBRULE(this.context_type2_level) },
        ]);
    });

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
        this.OR([
            {
                ALT: () => {
                    this.CONSUME(Int_dVarKeyword);
                    this.SUBRULE(this.ctxVarInDef, { LABEL: "ctxVar" });
                    this.SUBRULE(this.multDivLevel, { LABEL: "content" });
                }
            },
            {
                ALT: () => {
                    this.SUBRULE2(this.multDivLevel, { LABEL: "content" });
                    this.CONSUME2(Int_dVarKeyword);
                    this.SUBRULE2(this.ctxVarInDef, { LABEL: "ctxVar" });
                }
            },
        ]);
    });

    // d/dVar expr
    this.diff = this.RULE("diff", () => {
        this.CONSUME(DiffKeyword);
        this.SUBRULE(this.ctxVarInDef, { LABEL: "ctxVar" });
        this.SUBRULE(this.multDivLevel, { LABEL: "content" });
    });

    // context type 2: for, with
    this.context_type2_level = this.RULE("context_type2_level", () => {
        this.SUBRULE(this.multDivLevel, { LABEL: "content" });
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.SUBRULE(this.fromForKeyword) },
                { ALT: () => this.SUBRULE(this.fromWithKeyword) },
            ]);
        });
    });

    this.fromForKeyword = this.RULE("fromForKeyword", () => {
        this.CONSUME(ForKeyword);
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => {
                this.SUBRULE(this.ctxVarInDef, { LABEL: "ctxVar" });
                this.CONSUME(Equal);
                this.SUBRULE(this.multDivLevel, { LABEL: "content" });
            },
        });
    });

    this.fromWithKeyword = this.RULE("fromWithKeyword", () => {
        this.CONSUME(WithKeyword);
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => {
                this.SUBRULE(this.ctxVarInDef, { LABEL: "ctxVar" });
                this.CONSUME(Equal);
                this.SUBRULE(this.multDivLevel, { LABEL: "content" });
            },
        });
    });

    // Special def for ctxVariable:
    // ctx variables can override reserved variables
    // lexer donot implement this behavior so we need to implement it here
    // The ReservedVar below is not the actual ReservedVar, 
    // but still a ctxVariable that takes that name

    this.ctxVarInDef = this.RULE("ctxVarInDef", () => {
        this.OR([
            { ALT: () => this.CONSUME(CustomIdentifier, { LABEL: "ctxVarName" }) },
            { ALT: () => this.CONSUME(ReservedVar, { LABEL: "ctxVarName" }) },
        ]);
    });

}