import { Action, Colon, Comma, ComparisonOperator, Divide, Equal, Minus, Multiply, ParenthesisClose, ParenthesisOpen, Plus } from "../tokens/op-and-puncs";
import { DiffKeyword, ForKeyword, Int_dVarKeyword, IntKeyword, ProdKeyword, RootofKeyword, SumKeyword, WithKeyword } from "../tokens/keywords";
import { SupportOmittedCallFunc } from "../tokens/reserved-words/builtin-funcs";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        piecewise_start: any;
        piecewise_start2: any;
        piecewise_fromComp: any;
        piecewise_fromColon: any;
        piecewise_fromComma: any;
        piecewise_actionLevel: any;
        piecewise_addSubLevel: any;
        piecewise_contextLevel: any;
    }
}

export function initPiecewiseRules(this: FormulaParser) {

    // use a transition graph to handle ',' , ':' , and comparison operator in a same level.
    // because of the following rules: 
    // - all branches except the last must have conditions. When omit condition, omit colon ':'.
    // - all branches can omit return values. When omit return value, omit colon ':'. You cannot omit return value and condition at the same time.
    // - you can have no branches, then you should omit comma ','.

    this.piecewise_start = this.RULE("piecewise_start", () => {
        this.OPTION(() => {
            this.SUBRULE(this.piecewise_start2);
        });
    });

    this.piecewise_start2 = this.RULE("piecewise_start2", () => {
        this.SUBRULE(this.piecewise_actionLevel);
        this.OPTION2(() => {
            this.SUBRULE(this.piecewise_fromComp);
        });
    });


    this.piecewise_fromComp = this.RULE("piecewise_fromComp", () => {
        this.CONSUME(ComparisonOperator);
        this.SUBRULE(this.piecewise_actionLevel);
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.SUBRULE(this.piecewise_fromComp) },
                { ALT: () => this.SUBRULE(this.piecewise_fromColon) },
                { ALT: () => this.SUBRULE(this.piecewise_fromComma) },
            ]);
        });
    });

    this.piecewise_fromColon = this.RULE("piecewise_fromColon", () => {
        this.CONSUME(Colon);
        this.SUBRULE(this.piecewise_actionLevel);
        this.OPTION(() => {
            this.SUBRULE(this.piecewise_fromComma);
        });
    });

    this.piecewise_fromComma = this.RULE("piecewise_fromComma", () => {
        this.CONSUME(Comma);
        this.SUBRULE(this.piecewise_start2);
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
            { ALT: () => this.SUBRULE(this.context1) },
            // this is where piecewise context gets special. it forbids for and with statements.
            { ALT: () => this.SUBRULE(this.multDivLevel) },
        ]);
    });

}