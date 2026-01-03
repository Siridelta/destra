import { BraceClose, BraceOpen, BracketClose, BracketOpen, Comma, ParenthesisClose, ParenthesisOpen } from "../tokens/op-and-puncs";
import { NumberLiteral, Placeholder, Variable } from "../tokens/others";
import { BuiltinFunc } from "../tokens/reserved-words/builtin-funcs/categories";
import { Constant } from "../tokens/reserved-words/constants";
import { ReservedVar } from "../tokens/reserved-words/reservedVars";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        atomicExp: any;
        builtinFuncCall: any;
        argsList: any;
        fromPlaceholder: any;
        parenExp: any;
        listExp: any;
        piecewiseExp: any;
        numberLiteral: any;
        identifier: any;
    }
}

export function initAtomicRules(this: FormulaParser) {
    this.atomicExp = this.RULE("atomicExp", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.builtinFuncCall) },
            { ALT: () => this.SUBRULE(this.parenExp) },
            { ALT: () => this.SUBRULE(this.listExp) },
            { ALT: () => this.SUBRULE(this.piecewiseExp) },
            { ALT: () => this.SUBRULE(this.numberLiteral) },
            { ALT: () => this.SUBRULE(this.fromPlaceholder) },
            { ALT: () => this.SUBRULE(this.identifier) },
        ]);
    });

    //  --- Func Call forms ---
    //  
    // only builtinFunc and substituted FuncExpl (placeholder) can be called.

    this.builtinFuncCall = this.RULE("builtinFuncCall", () => {
        this.CONSUME(BuiltinFunc);
        this.SUBRULE(this.argsList);
    });

    // the argList rule is also used in other places like postfixLevel
    this.argsList = this.RULE("argsList", () => {
        this.CONSUME(ParenthesisOpen);
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.addSubLevel),
        });
        this.CONSUME(ParenthesisClose);
    });

    // A substitutable can start 2 types of syntax: 
    // - as a referred var 
    // - or as a referred func, being called, so must be followed by its arglist
    //
    // js form: `${myVar}` or `${myFunc}(1,1)`
    // parser source form: "${3}" or "${3}(1,1)" (myVar/myFunc is the 4th item in deps)
    // 
    // LL(k) parser requires us to merge the 2 syntaxes into one general rule,
    // so this needs to be further classified in semantics stage
    this.fromPlaceholder = this.RULE("fromPlaceholder", () => {
        this.CONSUME(Placeholder);
        this.OPTION(() => {
            this.SUBRULE(this.argsList);
        });
    });



    //  --- Brackets forms ---

    this.parenExp = this.RULE("parenExp", () => {
        this.CONSUME(ParenthesisOpen);
        this.SUBRULE(this.actionBatchLevel);
        this.CONSUME(ParenthesisClose);
    });

    this.listExp = this.RULE("listExp", () => {
        this.CONSUME(BracketOpen);
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.addSubLevel),
        });
        this.CONSUME(BracketClose);
    });

    this.piecewiseExp = this.RULE("piecewiseExp", () => {
        this.CONSUME(BraceOpen);
        this.SUBRULE(this.piecewise_start);
        this.CONSUME(BraceClose);
    });



    // --- Number & Identifier forms ---

    this.numberLiteral = this.RULE("numberLiteral", () => {
        this.CONSUME(NumberLiteral);
    });

    this.identifier = this.RULE("identifier", () => {
        this.OR([
            { ALT: () => this.CONSUME(Constant) },
            { ALT: () => this.CONSUME(ReservedVar) },
            { ALT: () => this.CONSUME(Variable) },
        ]);
    });

}