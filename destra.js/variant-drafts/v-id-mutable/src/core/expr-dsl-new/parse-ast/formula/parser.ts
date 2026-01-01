import { CstParser } from "chevrotain";
import { tokensList } from "../lexer";
import { Action, ArrowFunc, Colon, Comma, Equal, Greater, GreaterEqual, Less, LessEqual, Tilde } from "../tokens/op-and-puncs";
import { InKeyword } from "../tokens/keywords";
import { initAddSubRules } from "./addsub-rules";

export class FormulaParser extends CstParser {
    constructor() {
        super(tokensList);

        initAddSubRules.call(this);
        

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
            this.SUBRULE(this.addSubLevel);
        });
        this.CONSUME(Colon);
        this.OPTION2(() => {
            this.OPTION3(() => {
                this.SUBRULE2(this.addSubLevel);
            });
            this.CONSUME2(Colon);
        });
        this.OPTION4(() => {
            this.SUBRULE3(this.addSubLevel);
        });
    });

    public topLevel = this.RULE("topLevel", () => {
        this.SUBRULE(this.actionCommaLevel);
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Equal) },
                { ALT: () => this.CONSUME(Greater) },
                { ALT: () => this.CONSUME(Less) },
                { ALT: () => this.CONSUME(GreaterEqual) },
                { ALT: () => this.CONSUME(LessEqual) },
                { ALT: () => this.CONSUME(Tilde) },
                { ALT: () => this.CONSUME(ArrowFunc) },
            ]);
            this.SUBRULE2(this.actionCommaLevel);
        });
    });

    public actionCommaLevel = this.RULE("actionCommaLevel", () => {
        this.AT_LEAST_ONE_SEP({
            SEP: Comma, 
            DEF: () => this.SUBRULE(this.actionLevel),
        });
    });

    public actionLevel = this.RULE("actionLevel", () => {
        this.SUBRULE(this.addSubLevel);
        this.OPTION(() => {
            this.CONSUME(Action);
            this.SUBRULE2(this.addSubLevel);
        });
    });

}