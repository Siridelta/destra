import { DiffKeyword, ForKeyword, IntKeyword, ProdKeyword, SumKeyword, WithKeyword } from "../tokens/keywords";
import { Comma, Equal, Minus, ParenthesisClose, ParenthesisOpen, Plus } from "../tokens/op-and-puncs";
import { CustomIdentifier } from "../tokens/others";
import { ReservedVar } from "../tokens/reserved-words/reservedVars";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        addSubLevel: any;
        context_type2_level: any;
        fromForKeyword: any;
        fromWithKeyword: any;
        ctxVarInDef: any;
    }
}

export function initAddSubRules(this: FormulaParser) {
    this.addSubLevel = this.RULE("addSubLevel", () => {
        this.SUBRULE(this.context_type2_level, { LABEL: "lhs" });
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Plus, { LABEL: "operator" }) },
                { ALT: () => this.CONSUME(Minus, { LABEL: "operator" }) },
            ]);
            this.SUBRULE2(this.addSubLevel, { LABEL: "rhs" });
        });
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