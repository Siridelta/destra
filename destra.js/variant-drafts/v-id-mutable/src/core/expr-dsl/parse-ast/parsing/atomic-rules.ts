import { BraceClose, BraceOpen, BracketClose, BracketOpen, Comma, ParenthesisClose, ParenthesisOpen, RangeDots } from "../tokens/op-and-puncs";
import { NumberLiteral, Placeholder, CustomIdentifier, ColorHexLiteral } from "../tokens/others";
import { BuiltinFunc } from "../tokens/reserved-words/builtin-funcs/categories";
import { Constant } from "../tokens/reserved-words/constants";
import { ReservedVar } from "../tokens/reserved-words/reservedVars";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        atomicExp: any;
        builtinFuncCall: any;
        argsList: any;
        varOrCall: any;
        parenExp: any;
        listExp: any;
        listItem: any;
        piecewiseExp: any;
    }
}

export function initAtomicRules(this: FormulaParser) {
    this.atomicExp = this.RULE("atomicExp", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.builtinFuncCall, { LABEL: "case" }) },
            { ALT: () => this.SUBRULE(this.parenExp, { LABEL: "case" }) },
            { ALT: () => this.SUBRULE(this.listExp, { LABEL: "case" }) },
            { ALT: () => this.SUBRULE(this.piecewiseExp, { LABEL: "case" }) },
            { ALT: () => this.CONSUME(NumberLiteral) },
            { ALT: () => this.CONSUME(ColorHexLiteral) },
            { ALT: () => this.SUBRULE(this.varOrCall, { LABEL: "case" }) },
            { ALT: () => this.CONSUME(Constant) },
        ]);
    });

    //  --- Func Call forms ---
    //  
    // only builtinFunc and substituted FuncExpl (placeholder) can be called.

    // allow optional arglist to process omitted call in IMultAndOCall level
    this.builtinFuncCall = this.RULE("builtinFuncCall", () => {
        this.CONSUME(BuiltinFunc);
        this.OPTION(() => {
            this.SUBRULE(this.argsList);
        });
    });

    // the argList rule is also used in other places like postfixLevel
    this.argsList = this.RULE("argsList", () => {
        this.CONSUME(ParenthesisOpen);
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.addSubLevel, { LABEL: "arg" }),
        });
        this.CONSUME(ParenthesisClose);
    });

    /*
    
    A substitution / custom identifier can start 2 types of syntax: 
      - as a referred var 
      - or as a referred func, being called, so must be followed by its arglist
    
    For substitution:
      - js form: `${myVar}` or `${myFunc}(1,1)`
      - parser source form: "${3}" or "${3}(1,1)" (myVar/myFunc is the 4th item in deps)
     
    For custom identifier:
      - js form: `myVar` or `myFunc(1,1) = ...`
      - parser source form: `myVar` or `myFunc(1,1) = ...`
      
      - note that in common cases it is not possible to have a custom identifier as a function call,
        the only case is when starting a function definition:
        `f(x) = x^2`, 'f' is to specify the resulting FuncExpl's ID.

        so generally this rule is used in both cases, and the arglist is optional.
        semantic checks are required to ensure the correct usage.
    
    */
    this.varOrCall = this.RULE("varOrCall", () => {
        this.OR([
            {
                ALT: () => {
                    this.OR2([
                        { ALT: () => this.CONSUME(Placeholder) },
                        { ALT: () => this.CONSUME(CustomIdentifier) },
                    ]);
                    this.OPTION(() => {
                        this.SUBRULE(this.argsList);
                    });
                }
            },
            { ALT: () => this.CONSUME(ReservedVar) },
        ]);
    });



    //  --- Brackets forms ---

    this.parenExp = this.RULE("parenExp", () => {
        this.CONSUME(ParenthesisOpen);
        this.SUBRULE(this.commasLevel);
        this.CONSUME(ParenthesisClose);
    });

    this.listExp = this.RULE("listExp", () => {
        this.CONSUME(BracketOpen);
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.listItem),
        });
        this.CONSUME(BracketClose);
    });

    this.listItem = this.RULE("listItem", () => {
        this.SUBRULE(this.addSubLevel, { LABEL: "term" });
        this.OPTION(() => {
            this.CONSUME(RangeDots, { LABEL: "term" });
            this.SUBRULE2(this.addSubLevel, { LABEL: "term" });
        });
    });

    this.piecewiseExp = this.RULE("piecewiseExp", () => {
        this.CONSUME(BraceOpen);
        this.SUBRULE(this.piecewise_content);
        this.CONSUME(BraceClose);
    });

}