import { Action, ArrowFunc, Colon, Comma, Equal, Tilde, TopLevelComparisonOperator } from "../tokens/op-and-puncs";
import { InKeyword } from "../tokens/keywords";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        formula: any;
        inLevel: any;
        sliderDef: any;
        topLevel: any;
        commasLevel: any;
        actionLevel: any;
    }
}

export function initFormulaRules(this: FormulaParser) {
    this.formula = this.RULE("formula", () => {
        this.SUBRULE(this.inLevel);
    });

    this.inLevel = this.RULE("inLevel", () => {
        this.SUBRULE(this.topLevel);
        this.OPTION(() => {
            this.CONSUME(InKeyword);
            this.SUBRULE(this.sliderDef);
        });
    });

    this.sliderDef = this.RULE("sliderDef", () => {
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

    this.topLevel = this.RULE("topLevel", () => {
        this.SUBRULE(this.commasLevel);
        this.OPTION(() => {
            this.OR([
                {
                    ALT: () => {
                        this.OR2([
                            { ALT: () => this.CONSUME(Tilde) },
                            { ALT: () => this.CONSUME(ArrowFunc) },
                            { ALT: () => this.CONSUME(Equal) },
                        ]);
                        this.SUBRULE2(this.commasLevel);
                    }
                },
                {
                    ALT: () => {
                        this.CONSUME(TopLevelComparisonOperator);
                        this.AT_LEAST_ONE_SEP({
                            SEP: TopLevelComparisonOperator,
                            DEF: () => this.SUBRULE3(this.commasLevel),
                        });
                    }
                },
            ]);
        });
    });

    this.commasLevel = this.RULE("commasLevel", () => {
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.actionLevel),
        });
    });

    this.actionLevel = this.RULE("actionLevel", () => {
        this.SUBRULE(this.addSubLevel, { LABEL: "target" });
        this.OPTION(() => {
            this.CONSUME(Action);
            this.SUBRULE2(this.addSubLevel, { LABEL: "value" });
        });
    });
}
