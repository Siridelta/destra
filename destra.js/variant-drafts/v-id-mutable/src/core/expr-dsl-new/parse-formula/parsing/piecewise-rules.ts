import { Action, Colon, Comma, ComparisonOperator, Minus, Plus } from "../tokens/op-and-puncs";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        piecewise_content: any;
        piecewise_branch: any;
        piecewise_compLevel: any;
        piecewise_actionLevel: any;
        piecewise_addSubLevel: any;
        piecewise_contextLevel: any;
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
        this.AT_LEAST_ONE_SEP({
            SEP: ComparisonOperator,
            DEF: () => this.SUBRULE(this.piecewise_actionLevel),
        });
    });

    this.piecewise_actionLevel = this.RULE("piecewise_actionLevel", () => {
        this.SUBRULE(this.piecewise_addSubLevel);
        this.OPTION(() => {
            this.CONSUME(Action);
            this.SUBRULE2(this.piecewise_addSubLevel);
        });
    });

    this.piecewise_addSubLevel = this.RULE("piecewise_addSubLevel", () => {
        this.SUBRULE(this.piecewise_contextLevel);
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Plus) },
                { ALT: () => this.CONSUME(Minus) },
            ]);
            this.SUBRULE2(this.piecewise_addSubLevel);
        });
    });

    this.piecewise_contextLevel = this.RULE("piecewise_contextLevel", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.context_type1) },
            // this is where piecewise context gets special. it forbids for and with statements.
            { ALT: () => this.SUBRULE(this.multDivLevel) },
        ]);
    });

}