import { Bang, BracketClose, BracketOpen, Comma, ComparisonOperator, Divide, Dot, Equal, Minus, Multiply, ParenthesisClose, ParenthesisOpen, Plus, Power } from "../tokens/op-and-puncs";
import { DiffKeyword, ForKeyword, Int_dVarKeyword, IntKeyword, ProdKeyword, RootofKeyword, SumKeyword, WithKeyword } from "../tokens/keywords";
import { SupportExtensionFunc, SupportOmittedCallFunc } from "../tokens/reserved-words/builtin-funcs";
import { FormulaParser } from "./parser";
import "./identifier-rules";
import { Attribute } from "../tokens/reserved-words/reservedVars";

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
        multDivLevel: any;
        omittedCallLevel: any;
        prefixLevel: any;
        rootofLevel: any;
        powerLevel: any;
        postfixLevel: any;
        fromPostfixes: any;
        bang: any;
        fromDot: any;
        fromIndexer: any;
        funcCallParens: any;
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
        this.SUBRULE(this.CtxVariable);
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
        this.SUBRULE(this.CtxVariable);
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
                    this.SUBRULE(this.CtxVariable);
                    this.SUBRULE(this.multDivLevel);
                }
            },
            {
                ALT: () => {
                    this.SUBRULE2(this.multDivLevel);
                    this.CONSUME2(Int_dVarKeyword);
                    this.SUBRULE2(this.CtxVariable);
                }
            },
        ]);
    });

    // d/dVar expr
    this.diff = this.RULE("diff", () => {
        this.CONSUME(DiffKeyword);
        this.SUBRULE(this.CtxVariable);
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
        this.SUBRULE(this.CtxVariable);
        this.CONSUME(Equal);
        this.SUBRULE(this.multDivLevel);
    });

    this.withRemains = this.RULE("withRemains", () => {
        this.CONSUME(WithKeyword);
        this.SUBRULE(this.CtxVariable);
        this.CONSUME(Equal);
        this.SUBRULE(this.multDivLevel);
    });

    this.multDivLevel = this.RULE("multDivLevel", () => {
        this.SUBRULE(this.omittedCallLevel);
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Multiply) },
                { ALT: () => this.CONSUME(Divide) },
            ]);
            this.SUBRULE(this.multDivLevel);
        });
    });

    this.omittedCallLevel = this.RULE("omittedCallLevel", () => {
        this.OPTION(() => {
            this.CONSUME(SupportOmittedCallFunc);
        });
        this.SUBRULE(this.prefixLevel);
    });

    this.prefixLevel = this.RULE("prefixLevel", () => {
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Minus) },
                { ALT: () => this.CONSUME(Plus) },
            ]);
        });
        this.SUBRULE(this.rootofLevel);
    });

    this.rootofLevel = this.RULE("rootofLevel", () => {
        this.SUBRULE(this.powerLevel);
        this.OPTION(() => {
            this.CONSUME(RootofKeyword);
            this.SUBRULE(this.rootofLevel);
        });
    });

    this.powerLevel = this.RULE("powerLevel", () => {
        this.SUBRULE(this.postfixLevel);
        this.OPTION(() => {
            this.CONSUME(Power);
            this.SUBRULE2(this.postfixLevel);
        });
    });

    this.postfixLevel = this.RULE("postfixLevel", () => {
        this.SUBRULE(this.atomicLevel);
        this.OPTION(() => {
            this.SUBRULE(this.fromPostfixes);
        });
    });

    this.fromPostfixes = this.RULE("fromPostfixes", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.bang) },
            { ALT: () => this.SUBRULE(this.fromDot) },
            { ALT: () => this.SUBRULE(this.fromIndexer) },
            { ALT: () => this.CONSUME(this.funcCallParens) },
        ]);
    });

    this.bang = this.RULE("bang", () => {
        this.CONSUME(Bang);
        this.OPTION(() => {
            this.SUBRULE(this.fromPostfixes);
        });
    });

    this.fromDot = this.RULE("fromDot", () => {
        this.CONSUME(Dot);
        this.OR([
            {
                ALT: () => {
                    this.CONSUME(Attribute);
                    this.OPTION(() => {
                        this.SUBRULE(this.fromPostfixes);
                    });
                }
            },
            {
                ALT: () => {
                    this.CONSUME(SupportExtensionFunc);
                    this.OPTION2(() => {
                        this.OPTION3(() => {
                            this.SUBRULE2(this.funcCallParens);
                        });
                        this.SUBRULE3(this.fromPostfixes);
                    });
                }
            },
        ]);
    });

    // L[1,2,3]
    // L[a]
    // L[L2 > L3]
    this.fromIndexer = this.RULE("fromIndexer", () => {
        this.CONSUME(BracketOpen);
        this.SUBRULE(this.addSubLevel);
        this.OPTION(() => {
            this.OR([
                {
                    ALT: () => {
                        this.CONSUME(ComparisonOperator);
                        this.SUBRULE2(this.addSubLevel);
                    }
                },
                {
                    ALT: () => {
                        this.CONSUME(Comma);
                        this.AT_LEAST_ONE_SEP({
                            SEP: Comma,
                            DEF: () => this.SUBRULE3(this.addSubLevel),
                        });
                    }
                },
            ]);
        });
        this.CONSUME(BracketClose);
        this.OPTION(() => {
            this.SUBRULE(this.fromPostfixes);
        });
    });

    this.funcCallParens = this.RULE("funcCallParens", () => {
        this.CONSUME(ParenthesisOpen);
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.addSubLevel),
        });
        this.CONSUME(ParenthesisClose);
        this.OPTION(() => {
            this.SUBRULE(this.fromPostfixes);
        });
    });



}