import { RootofKeyword } from "../tokens/keywords";
import { Bang, BracketClose, BracketOpen, Comma, ComparisonOperator, Divide, Dot, Minus, Multiply, Plus, Power } from "../tokens/op-and-puncs";
import { SupportExtensionFunc, SupportOmittedCallFunc } from "../tokens/reserved-words/builtin-funcs/categories";
import { Attribute } from "../tokens/reserved-words/reservedVars";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        multDivLevel: any;
        omittedCallLevel: any;
        prefixLevel: any;
        rootofLevel: any;
        powerLevel: any;
        postfixLevel: any;
        fromPostfix: any;
        bang: any;
        fromDot: any;
        fromIndexer: any;
    }
}

export function initMultDivRules(this: FormulaParser) {

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



    //  --- PostfixLevel ---

    this.postfixLevel = this.RULE("postfixLevel", () => {
        this.SUBRULE(this.atomicExp);
        this.OPTION(() => {
            this.SUBRULE(this.fromPostfix);
        });
    });

    this.fromPostfix = this.RULE("fromPostfix", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.bang) },
            { ALT: () => this.SUBRULE(this.fromDot) },
            { ALT: () => this.SUBRULE(this.fromIndexer) },
        ]);
    });

    this.bang = this.RULE("bang", () => {
        this.CONSUME(Bang);
        this.OPTION(() => {
            this.SUBRULE(this.fromPostfix);
        });
    });

    this.fromDot = this.RULE("fromDot", () => {
        this.CONSUME(Dot);
        this.OR([
            // L.x, L.y, L.z
            { ALT: () => this.CONSUME(Attribute) },
            // L.extFunc(x)
            {
                ALT: () => {
                    this.CONSUME(SupportExtensionFunc);
                    this.OPTION2(() => {
                        this.SUBRULE(this.argsList);
                    });
                }
            },
        ]);
        this.OPTION(() => {
            this.SUBRULE(this.fromPostfix);
        });
    });

    // Indexer
    //
    // List Indexer supports all types of in-square-bracket syntaxes
    // (while List Literal only support array-like syntax):
    // - L[1,2,3]
    // - L[a]
    // - L[L2 > L3]
    //
    // We need to extract the commmon left factor: the first addSubLevel expression, 
    // then could we divert into different branches.
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
        this.OPTION2(() => {
            this.SUBRULE(this.fromPostfix);
        });
    });


}