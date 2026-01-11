import { BuiltinFuncCallASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { DivisionASTNode, ModASTNode, PowerASTNode, RootofASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { BuiltinFuncASTNode, NumberASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/terminals";
import { ASTVisitor } from "../../expr-dsl/visit-ast/ast-visitor";

export type N_NumberASTNode = {
    type: "number",
    base: {
        integer?: string,
        decimal?: string,
    },
}

export class ASTExpander extends ASTVisitor<any, void> {

    // 增加 default 支持，为所有不匹配的分支重定向到 default 分支
    public visit(node: any, context: void): any {
        const type = node.type;
        if (type && type in this) {
            return this.visit(node, context);
        } else {
            return this.default(node, context);
        }
    }

    public default<T extends object>(node: T, context: void): T {
        for (const [k, v] of Object.entries(node) as [keyof T, any][]) {
            if (typeof v === 'object' && Object.keys(v).includes('type')) {
                node[k] = this.visit(v, context);
            }
        }
        return node;
    }
}

export interface ASTExpander {
    number(node: NumberASTNode): NumberAST_ExpandResult;
    rootof(node: RootofASTNode): RootofAST_ExpandResult;
    mod(node: ModASTNode): ModAST_ExpandResult;
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
ASTExpander.prototype.number = function (node: NumberASTNode): NumberAST_ExpandResult {
    if (!node.exponent) return node;

    return {
        type: 'multiplication',
        left: {
            type: 'number',
            base: node.base,
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

type RootofAST_ExpandResult = 
    PowerASTNode & {
        base: N_NumberASTNode
        exponent: DivisionASTNode & {
            left: N_NumberASTNode & {
                base: { integer: '1', decimal: undefined }
            }
            right: any
        }
    };
ASTExpander.prototype.rootof = function (node: RootofASTNode): RootofAST_ExpandResult {
    return {
        type: 'power',
        base: node.index,
        exponent: {
            type: 'division',
            left: {
                type: 'number',
                base: { integer: '1', decimal: undefined },
            },
            right: node.operand,
        },
    }
}

type ModAST_ExpandResult = 
    BuiltinFuncCallASTNode & {
        func: BuiltinFuncASTNode & {
            name: 'mod'
        }
        args: [
            any,
            any
        ]
    };
ASTExpander.prototype.mod = function (node: ModASTNode): ModAST_ExpandResult {
    return {
        type: 'builtinFuncCall',
        func: {
            type: 'builtinFunc',
            name: 'mod',
        },
        args: [node.left, node.right],
    }
}

