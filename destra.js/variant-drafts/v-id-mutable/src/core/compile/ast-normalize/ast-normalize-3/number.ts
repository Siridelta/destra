import { ASTNormalizer3 } from ".";
import { NumberASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/terminals";

declare module '.' {
    interface ASTNormalizer3 {
        number(node: NumberASTNode): NumberAST_ExpandResult;
    }
}


export type N_NumberASTNode = {
    type: "number",
    base: {
        integer?: string,
        decimal?: string,
    },
    exponent: undefined;
}

type NumberAST_ExpandResult =
    | N_NumberASTNode
    | {
        type: 'multiplication',
        left: N_NumberASTNode
        right: {
            type: 'power',
            base: {
                type: 'number',
                base: { integer: '10', decimal: undefined }
            },
            exponent:
            | {
                type: 'number',
                base: { integer: string, decimal: undefined }
            }
            | {
                type: 'unaryMinus',
                operand: {
                    type: 'number',
                    base: { integer: string, decimal: undefined }
                }
            }
        }
    };
ASTNormalizer3.prototype.number = function (node: NumberASTNode): NumberAST_ExpandResult {
    if (node.exponent === undefined) return node as N_NumberASTNode;

    return {
        type: 'multiplication',
        left: {
            type: 'number',
            base: node.base,
            exponent: undefined,
        },
        right: {
            type: 'power',
            base: {
                type: 'number',
                base: { integer: '10', decimal: undefined },
            },
            exponent: node.exponent.sign === '-'
                ? {
                    type: 'unaryMinus',
                    operand: {
                        type: 'number',
                        base: { integer: node.exponent.integer, decimal: undefined },
                    },
                }
                : {
                    type: 'number',
                    base: { integer: node.exponent.integer, decimal: undefined },
                },
        },
    }
}