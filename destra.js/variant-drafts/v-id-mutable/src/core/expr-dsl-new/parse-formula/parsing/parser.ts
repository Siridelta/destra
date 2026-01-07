import { MyCstParserBase } from "./myCstParserBase";
import { tokensList } from "../lexing/lexer";
import { Action, ArrowFunc, Colon, Comma, Equal, Greater, GreaterEqual, Less, LessEqual, Tilde, TopLevelComparisonOperator } from "../tokens/op-and-puncs";
import { InKeyword } from "../tokens/keywords";
import { initAddSubRules } from "./addsub-rules";
import { initMultDivRules } from "./multdiv-rules";
import { initAtomicRules } from "./atomic-rules";
import { initPiecewiseRules } from "./piecewise-rules";

export class FormulaParser extends MyCstParserBase {

    constructor() {
        super(tokensList);

        initAddSubRules.call(this);
        initMultDivRules.call(this);
        initAtomicRules.call(this);
        initPiecewiseRules.call(this);

        this.performSelfAnalysis();
    }

    public formula = this.RULE("formula", () => {
        this.SUBRULE(this.inLevel);
    });

    public inLevel = this.RULE("inLevel", () => {
        this.SUBRULE(this.topLevel);
        this.OPTION(() => {
            this.CONSUME(InKeyword);
            this.SUBRULE(this.sliderDef);
        });
    });

    public sliderDef = this.RULE("sliderDef", () => {
        this.OPTION(() => {
            this.SUBRULE(this.addSubLevel, { LABEL: "term" });
        });
        this.CONSUME(Colon, { LABEL: "term" });
        this.OPTION2(() => {
            this.OR([
                {
                    ALT: () => {
                        this.SUBRULE2(this.addSubLevel, { LABEL: "term" });
                        this.OPTION3(() => {
                            this.CONSUME2(Colon, { LABEL: "term" });
                            this.OPTION4(() => {
                                this.SUBRULE3(this.addSubLevel, { LABEL: "term" });
                            });
                        });
                    }
                },
                {
                    ALT: () => {
                        this.CONSUME3(Colon, { LABEL: "term" });
                        this.OPTION5(() => {
                            this.SUBRULE4(this.addSubLevel, { LABEL: "term" });
                        });
                    }
                },
            ]);
        });
    });

    public topLevel = this.RULE("topLevel", () => {
        this.SUBRULE(this.actionBatchLevel);
        this.OPTION(() => {
            this.OR([
                {
                    ALT: () => {
                        this.OR2([
                            { ALT: () => this.CONSUME(Tilde) },
                            { ALT: () => this.CONSUME(ArrowFunc) },
                            { ALT: () => this.CONSUME(Equal) },
                        ]);
                        this.SUBRULE2(this.actionBatchLevel);
                    }
                },
                {
                    ALT: () => {
                        this.CONSUME(TopLevelComparisonOperator);
                        this.AT_LEAST_ONE_SEP({
                            SEP: TopLevelComparisonOperator,
                            DEF: () => this.SUBRULE3(this.actionBatchLevel),
                        });
                    }
                },
            ]);
        });
    });

    public actionBatchLevel = this.RULE("actionBatchLevel", () => {
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.actionLevel),
        });
    });

    public actionLevel = this.RULE("actionLevel", () => {
        this.SUBRULE(this.addSubLevel, { LABEL: "target" });
        this.OPTION(() => {
            this.CONSUME(Action);
            this.SUBRULE2(this.addSubLevel, { LABEL: "value" });
        });
    });

}

export const formulaParser = new FormulaParser();