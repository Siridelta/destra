import { Action, Colon, Comma, ComparisonOperator1, ComparisonOperator2, Minus, Plus } from "../tokens/op-and-puncs";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        piecewise_content: any;
        piecewise_branch: any;
        piecewise_compLevel: any;
        piecewise_actionLevel: any;
    }
}

export function initPiecewiseRules(this: FormulaParser) {

    this.piecewise_content = this.RULE("piecewise_content", () => {
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.piecewise_branch),
        });
    });

    this.piecewise_branch = this.RULE("piecewise_branch", () => {
        this.SUBRULE(this.piecewise_compLevel);
        this.OPTION(() => {
            this.CONSUME(Colon);
            this.SUBRULE(this.piecewise_actionLevel);
        });
    });

    this.piecewise_compLevel = this.RULE("piecewise_compLevel", () => {
        this.SUBRULE(this.piecewise_actionLevel);
        this.OPTION(() => {
            this.OR([
                {
                    ALT: () => {
                        this.CONSUME(ComparisonOperator1);
                        this.AT_LEAST_ONE_SEP({
                            SEP: ComparisonOperator1,
                            DEF: () => this.SUBRULE2(this.piecewise_actionLevel),
                        })
                    }
                },
                {
                    ALT: () => {
                        this.CONSUME(ComparisonOperator2);
                        this.AT_LEAST_ONE_SEP2({
                            SEP: ComparisonOperator2,
                            DEF: () => this.SUBRULE3(this.piecewise_actionLevel),
                        })
                    }
                },
            ]);
        })
    });

    this.piecewise_actionLevel = this.RULE("piecewise_actionLevel", () => {
        this.SUBRULE(this.addSubLevel);
        this.OPTION(() => {
            this.CONSUME(Action);
            this.SUBRULE2(this.addSubLevel);
        });
    });

}