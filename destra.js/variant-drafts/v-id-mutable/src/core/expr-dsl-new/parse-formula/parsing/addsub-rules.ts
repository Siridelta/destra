import { DiffKeyword, ForKeyword, Int_dVarKeyword, IntKeyword, ProdKeyword, SumKeyword, WithKeyword } from "../tokens/keywords";
import { Comma, Equal, Minus, ParenthesisClose, ParenthesisOpen, Plus } from "../tokens/op-and-puncs";
import { Variable } from "../tokens/others";
import { ReservedVar } from "../tokens/reserved-words/reservedVars";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        addSubLevel: any;
        contextLevel: any;
        context1: any;
        context2Level: any;
        sum: any;
        prod: any;
        int: any;
        diff: any;
        forRemains: any;
        withRemains: any;
        ctxVariable: any;
    }
}

export function initAddSubRules(this: FormulaParser) {
    this.addSubLevel = this.RULE("addSubLevel", () => {
        this.SUBRULE(this.contextLevel);
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Plus) },
                { ALT: () => this.CONSUME(Minus) },
            ]);
            this.SUBRULE2(this.addSubLevel);
        });
    });

    this.contextLevel = this.RULE("contextLevel", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.context1) },
            { ALT: () => this.SUBRULE(this.context2Level) },
        ]);
    });

    this.context1 = this.RULE("context1", () => {
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
        this.SUBRULE(this.ctxVariable);
        this.CONSUME(Equal);
        this.SUBRULE(this.addSubLevel);
        this.CONSUME(Comma);
        this.SUBRULE2(this.addSubLevel);
        this.CONSUME(ParenthesisClose);
        this.SUBRULE(this.multDivLevel);
    });

    // prod(var=lower, upper) expr
    this.prod = this.RULE("prod", () => {
        this.CONSUME(ProdKeyword);
        this.CONSUME(ParenthesisOpen);
        this.SUBRULE(this.ctxVariable);
        this.CONSUME(Equal);
        this.SUBRULE(this.addSubLevel);
        this.CONSUME(Comma);
        this.SUBRULE2(this.addSubLevel);
        this.CONSUME(ParenthesisClose);
        this.SUBRULE(this.multDivLevel);
    });

    // int(lower, upper) expr dx
    // int(lower, upper) dx expr
    this.int = this.RULE("int", () => {
        this.CONSUME(IntKeyword);
        this.CONSUME(ParenthesisOpen);
        this.SUBRULE(this.addSubLevel);
        this.CONSUME(Comma);
        this.SUBRULE2(this.addSubLevel);
        this.CONSUME(ParenthesisClose);
        this.OR([
            {
                ALT: () => {
                    this.CONSUME(Int_dVarKeyword);
                    this.SUBRULE(this.ctxVariable);
                    this.SUBRULE(this.multDivLevel);
                }
            },
            {
                ALT: () => {
                    this.SUBRULE2(this.multDivLevel);
                    this.CONSUME2(Int_dVarKeyword);
                    this.SUBRULE2(this.ctxVariable);
                }
            },
        ]);
    });

    // d/dVar expr
    this.diff = this.RULE("diff", () => {
        this.CONSUME(DiffKeyword);
        this.SUBRULE(this.ctxVariable);
        this.SUBRULE(this.multDivLevel);
    });

    this.context2Level = this.RULE("context2Level", () => {
        this.SUBRULE(this.multDivLevel);
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.SUBRULE(this.forRemains) },
                { ALT: () => this.SUBRULE(this.withRemains) },
            ]);
        });
    });

    this.forRemains = this.RULE("forRemains", () => {
        this.CONSUME(ForKeyword);
        this.SUBRULE(this.ctxVariable);
        this.CONSUME(Equal);
        this.SUBRULE(this.multDivLevel);
    });

    this.withRemains = this.RULE("withRemains", () => {
        this.CONSUME(WithKeyword);
        this.SUBRULE(this.ctxVariable);
        this.CONSUME(Equal);
        this.SUBRULE(this.multDivLevel);
    });
    
    this.ctxVariable = this.RULE("ctxVariable", () => {
        this.OR([
            { ALT: () => this.CONSUME(Variable) },
            // ctx variables can override reserved variables
            // lexer donot implement this behavior so we need to implement it here
            // The reserved var below is actually the ctxVariable that takes the name
            { ALT: () => this.CONSUME(ReservedVar) },    
        ]);
    });

}