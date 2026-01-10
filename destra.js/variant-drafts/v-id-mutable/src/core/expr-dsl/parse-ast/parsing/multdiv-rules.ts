import { RootofKeyword } from "../tokens/keywords";
import { Bang, Bar, BracketClose, BracketOpen, Comma, ComparisonOperator1, ComparisonOperator2, Cross, Divide, Dot, Minus, Multiply, Plus, Power, RangeDots } from "../tokens/op-and-puncs";
import { SupportExtensionFunc, SupportOmittedCallFunc } from "../tokens/reserved-words/builtin-funcs/categories";
import { Attribute } from "../tokens/reserved-words/reservedVars";
import { FormulaParser } from "./parser";
import { tokenMatcher } from "chevrotain";

declare module './parser' {
    export interface FormulaParser {
        multDivLevel: any;
        iMultAndOCallLevel: any;
        prefixLevel: any;
        rootofLevel: any;
        powerLevel: any;
        postfixLevel: any;
        fromPostfix: any;
        factorial: any;
        fromDot: any;
        fromIndexer: any;
        indexerRestItem: any;
    }
}

export function initMultDivRules(this: FormulaParser) {

    this.multDivLevel = this.RULE("multDivLevel", () => {
        this.SUBRULE(this.iMultAndOCallLevel, { LABEL: "lhs" });
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Multiply, { LABEL: "operator" }) },
                { ALT: () => this.CONSUME(Divide, { LABEL: "operator" }) },
                { ALT: () => this.CONSUME(Cross, { LABEL: "operator" }) },
            ]);
            this.SUBRULE2(this.multDivLevel, { LABEL: "rhs" });
        });
    });

    this.iMultAndOCallLevel = this.RULE("iMultAndOCallLevel", () => {
        this.SUBRULE(this.prefixLevel);
        this.MANY({
            GATE: () => {
                const nextToken = this.LA(1);
                // Implicit multiplication cannot start with + or - or | operator
                // e.g. "a + b" should be addition, not "a * (+b)"
                if (tokenMatcher(nextToken, Plus) || tokenMatcher(nextToken, Minus) || tokenMatcher(nextToken, Bar)) {
                    return false;
                }
                return true;
            },
            DEF: () => this.SUBRULE2(this.prefixLevel),
        })
    });

    this.prefixLevel = this.RULE("prefixLevel", () => {
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Minus, { LABEL: "operator" }) },
                { ALT: () => this.CONSUME(Plus, { LABEL: "operator" }) },
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
        this.OR([
            { ALT: () => this.SUBRULE(this.postfixLevel) },
            { ALT: () => this.SUBRULE(this.context_type1) },
        ]);
        this.OPTION(() => {
            this.CONSUME(Power);
            this.SUBRULE2(this.powerLevel);
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
            { ALT: () => this.SUBRULE(this.factorial, { LABEL: "case" }) },
            { ALT: () => this.SUBRULE(this.fromDot, { LABEL: "case" }) },
            { ALT: () => this.SUBRULE(this.fromIndexer, { LABEL: "case" }) },
        ]);
    });

    this.factorial = this.RULE("factorial", () => {
        this.CONSUME(Bang);
        this.OPTION(() => {
            this.SUBRULE(this.fromPostfix);
        });
    });

    this.fromDot = this.RULE("fromDot", () => {
        this.CONSUME(Dot);
        this.OR([
            // L.x, L.y, L.z
            { ALT: () => this.CONSUME(Attribute, { LABEL: "attr" }) },
            // L.extFunc(x)
            {
                ALT: () => {
                    this.CONSUME(SupportExtensionFunc, { LABEL: "extFunc" });
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
        this.SUBRULE(this.addSubLevel, { LABEL: "firstFactor" });
        this.OPTION(() => {
            this.OR([
                // L[L1 > L2 < L3 < L4]
                {
                    ALT: () => {
                        this.CONSUME(ComparisonOperator1);
                        this.AT_LEAST_ONE_SEP({
                            SEP: ComparisonOperator1,
                            DEF: () => this.SUBRULE2(this.addSubLevel, { LABEL: "compOperand" }),
                        })
                    }
                },
                // L[L1 = L2 == L3 == L4]
                {
                    ALT: () => {
                        this.CONSUME(ComparisonOperator2);
                        this.AT_LEAST_ONE_SEP2({
                            SEP: ComparisonOperator2,
                            DEF: () => this.SUBRULE3(this.addSubLevel, { LABEL: "compOperand" }),
                        })
                    }
                },
                {
                    ALT: () => {
                        // start with '1...3' or '1...'
                        this.OPTION2(() => {
                            this.CONSUME(RangeDots, { LABEL: "firstItemRest" });
                            this.OPTION3(() => {
                                this.SUBRULE4(this.addSubLevel, { LABEL: "firstItemRest" });
                            });
                        });
                        this.OPTION4(() => {
                            this.CONSUME(Comma);
                            this.AT_LEAST_ONE_SEP3({
                                SEP: Comma,
                                DEF: () => this.SUBRULE(this.indexerRestItem),
                            });
                        });
                    }
                },
            ]);
        });
        this.CONSUME(BracketClose);
        this.OPTION5(() => {
            this.SUBRULE(this.fromPostfix);
        });
    });

    this.indexerRestItem = this.RULE("indexerRestItem", () => {
        this.OR2([
            // ', ... ,'
            { ALT: () => this.CONSUME2(RangeDots, { LABEL: "item" }) },
            // ', 1,'
            // ', 1...,'
            // ', 1...3,'
            {
                ALT: () => {
                    this.SUBRULE5(this.addSubLevel, { LABEL: "item" });
                    this.OPTION5(() => {
                        this.CONSUME3(RangeDots, { LABEL: "item" });
                        this.OPTION6(() => {
                            this.SUBRULE6(this.addSubLevel, { LABEL: "item" });
                        });
                    });
                }
            },
        ]);
    });


}