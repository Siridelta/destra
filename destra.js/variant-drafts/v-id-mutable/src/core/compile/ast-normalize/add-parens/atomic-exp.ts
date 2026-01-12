import { ASTParenAdder } from ".";
import { ContextType2LevelASTNode, isContextType2LevelASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/addSub-level";
import { ListExpASTNode, TupleExpASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { PiecewiseExpASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/piecewise-exp";
import { NumberASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/terminals";
import { wrapWithParentheses } from "../utils";

declare module '.' {
    interface ASTParenAdder {
        number(node: NumberASTNode): NumberAST_ExpandResult;

        // Avoid ambiguity of comma usage with for/with clauses
        tupleExp(node: TupleExpASTNode): TupleExpASTNode;
        listExp(node: ListExpASTNode): ListExpASTNode;
        piecewiseExp(node: PiecewiseExpASTNode): PiecewiseExpASTNode;
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
ASTParenAdder.prototype.number = function (node: NumberASTNode): NumberAST_ExpandResult {
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

ASTParenAdder.prototype.tupleExp = function (node: TupleExpASTNode): TupleExpASTNode {
    node = { ...node };
    node.items = node.items.map(item => {
        item = this.visit(item);
        if (isContextType2LevelASTNode(item) && item.ctxVarDefs.length > 1) {
            item = wrapWithParentheses(item);
        }
        return item;
    });
    return node;
}

// If list exp only have 1 term as a for clause, it is legal even with multiple context var defs
// And if at the last index and with only 1 ctx var def, it is also legal
ASTParenAdder.prototype.listExp = function (node: ListExpASTNode): ListExpASTNode {
    node = { ...node };
    node.items = node.items.map((item, i) => {
        item = this.visit(item);
        if (
            isContextType2LevelASTNode(item)
            && !(
                node.items.length === 1
                && item.type === 'forClause'
            )
            && !(
                i === node.items.length - 1
                && item.ctxVarDefs.length === 1
            )
        ) {
            item = wrapWithParentheses(item);
        }
        return item;
    });
    return node;
}

ASTParenAdder.prototype.piecewiseExp = function (node: PiecewiseExpASTNode): PiecewiseExpASTNode {
    node = { ...node };
    node.branches = node.branches.map(branch => {
        branch = this.visit(branch);
        if (branch.type !== 'piecewiseBranch')
            return branch;    // default value branch, passes unconditionally
        if (branch.value)
            if (isContextType2LevelASTNode(branch.value))
                branch.value = wrapWithParentheses(branch.value);
        if (branch.condition)
            branch.condition.operands = branch.condition.operands.map(operand =>
                isContextType2LevelASTNode(operand)
                    ? wrapWithParentheses(operand)
                    : operand
            );

        return branch;
    });
    return node;
}