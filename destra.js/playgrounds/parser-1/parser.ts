import { CstParser } from "chevrotain";
import {
    tokensList,
    NumberLiteral,
    StringLiteral,
    Identifier,
    RangeDots,
    Plus,
    Minus,
    Multiply,
    Divide,
    Power,
    Comma,
    ParenthesisOpen,
    ParenthesisClose,
    BracketOpen,
    BracketClose,
} from "./lexer";

export class DestraParser extends CstParser {
    constructor() {
        super(tokensList);
        this.performSelfAnalysis();
    }

    public expression = this.RULE("expression", () => {
        this.SUBRULE(this.additionExpression);
    });

    public additionExpression = this.RULE("additionExpression", () => {
        this.SUBRULE(this.multiplicationExpression);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(Plus) },
                { ALT: () => this.CONSUME(Minus) },
            ]);
            this.SUBRULE2(this.multiplicationExpression);
        });
    });

    public multiplicationExpression = this.RULE("multiplicationExpression", () => {
        this.SUBRULE(this.powerExpression);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(Multiply) },
                { ALT: () => this.CONSUME(Divide) },
            ]);
            this.SUBRULE2(this.powerExpression);
        });
    });

    public powerExpression = this.RULE("powerExpression", () => {
        this.SUBRULE(this.atomicExpression);
        this.MANY(() => {
            this.CONSUME(Power);
            this.SUBRULE2(this.atomicExpression);
        });
    });

    public atomicExpression = this.RULE("atomicExpression", () => {
        this.OR([
            { ALT: () => this.CONSUME(NumberLiteral) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.SUBRULE(this.listExpression) },
            { ALT: () => this.SUBRULE(this.parenthesisExpression) },
            { ALT: () => this.SUBRULE(this.functionCallOrVariable) },
        ]);
    });

    public listExpression = this.RULE("listExpression", () => {
        this.CONSUME(BracketOpen);
        this.OPTION(() => {
            this.SUBRULE(this.listContent);
        });
        this.CONSUME(BracketClose);
    });

    public listContent = this.RULE("listContent", () => {
        this.SUBRULE(this.expression);
        this.OPTION(() => {
            this.OR([
                {
                    ALT: () => {
                        this.CONSUME(RangeDots);
                        this.SUBRULE2(this.expression);
                    }
                },
                {
                    ALT: () => {
                        this.MANY(() => {
                            this.CONSUME(Comma);
                            this.SUBRULE3(this.expression);
                        });
                    }
                }
            ]);
        });
    });

    public parenthesisExpression = this.RULE("parenthesisExpression", () => {
        this.CONSUME(ParenthesisOpen);
        this.SUBRULE(this.expression);
        this.CONSUME(ParenthesisClose);
    });

    public functionCallOrVariable = this.RULE("functionCallOrVariable", () => {
        this.CONSUME(Identifier);
        this.OPTION(() => {
            this.CONSUME(ParenthesisOpen);
            this.OPTION2(() => {
                this.SUBRULE(this.arguments);
            });
            this.CONSUME(ParenthesisClose);
        });
    });

    public arguments = this.RULE("arguments", () => {
        this.SUBRULE(this.expression);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.expression);
        });
    });
}

// Singleton instance
export const parser = new DestraParser();

