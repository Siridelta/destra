import { parser } from "./parser";

const BaseVisitor = parser.getBaseCstVisitorConstructor();

export class DestraVisitor extends BaseVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }

    expression(ctx) {
        return this.visit(ctx.additionExpression);
    }

    additionExpression(ctx) {
        let result = this.visit(ctx.multiplicationExpression[0]);

        if (ctx.multiplicationExpression.length > 1) {
            for (let i = 1; i < ctx.multiplicationExpression.length; i++) {
                const operator = ctx.Plus?.[i - 1] ? "+" : "-";
                result = {
                    type: "BinaryExpression",
                    operator,
                    left: result,
                    right: this.visit(ctx.multiplicationExpression[i]),
                };
            }
        }
        return result;
    }

    multiplicationExpression(ctx) {
        let result = this.visit(ctx.powerExpression[0]);

        if (ctx.powerExpression.length > 1) {
            for (let i = 1; i < ctx.powerExpression.length; i++) {
                const operator = ctx.Multiply?.[i - 1] ? "*" : "/";
                result = {
                    type: "BinaryExpression",
                    operator,
                    left: result,
                    right: this.visit(ctx.powerExpression[i]),
                };
            }
        }
        return result;
    }

    powerExpression(ctx) {
        // Power is typically right-associative: 2^3^4 = 2^(3^4)
        // But here for simplicity I'll do left-associative as implemented in the grammar loop above,
        // or just treat it linearly.
        // Wait, parser definition was: SUBRULE(atomic), MANY(Power, SUBRULE2(atomic))
        // This structure is linear flat list in CST.
        // Let's stick to left-associative for this demo unless I change the loop logic.
        let result = this.visit(ctx.atomicExpression[0]);

        if (ctx.atomicExpression.length > 1) {
            for (let i = 1; i < ctx.atomicExpression.length; i++) {
                result = {
                    type: "BinaryExpression",
                    operator: "^",
                    left: result,
                    right: this.visit(ctx.atomicExpression[i]),
                };
            }
        }
        return result;
    }

    atomicExpression(ctx) {
        if (ctx.NumberLiteral) {
            return {
                type: "Literal",
                value: parseFloat(ctx.NumberLiteral[0].image),
                kind: "number"
            };
        }
        if (ctx.StringLiteral) {
            return {
                type: "Literal",
                value: ctx.StringLiteral[0].image.slice(1, -1), // Remove quotes
                kind: "string"
            };
        }
        if (ctx.listExpression) {
            return this.visit(ctx.listExpression);
        }
        if (ctx.parenthesisExpression) {
            return this.visit(ctx.parenthesisExpression);
        }
        if (ctx.functionCallOrVariable) {
            return this.visit(ctx.functionCallOrVariable);
        }
    }

    listExpression(ctx) {
        if (ctx.listContent) {
            return this.visit(ctx.listContent);
        }
        return { type: "List", elements: [] };
    }

    listContent(ctx) {
        const first = this.visit(ctx.expression[0]);

        if (ctx.RangeDots) {
            // Range: [start ... end]
            const end = this.visit(ctx.expression[1]);
            return {
                type: "Range",
                start: first,
                end: end,
            };
        } else {
            // Regular List: [e1, e2, ...]
            const elements = [first];
            if (ctx.expression.length > 1) {
                for (let i = 1; i < ctx.expression.length; i++) {
                    elements.push(this.visit(ctx.expression[i]));
                }
            }
            return {
                type: "List",
                elements,
            };
        }
    }

    parenthesisExpression(ctx) {
        // Unwrap parenthesis
        return this.visit(ctx.expression);
    }

    functionCallOrVariable(ctx) {
        const identifier = ctx.Identifier[0].image;

        if (ctx.ParenthesisOpen) {
            // Function Call
            let args = [];
            if (ctx.arguments) {
                args = this.visit(ctx.arguments);
            }
            return {
                type: "CallExpression",
                callee: identifier,
                arguments: args,
            };
        } else {
            // Variable
            return {
                type: "Identifier",
                name: identifier,
            };
        }
    }

    arguments(ctx) {
        return ctx.expression.map((node) => this.visit(node));
    }
}

