import { ASTParenAdder } from ".";
import { ListExpASTNode, TupleExpASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { PiecewiseExpASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/piecewise-exp";

declare module '.' {
    interface ASTParenAdder {

        // Avoid ambiguity of comma usage with for/with clauses
        tupleExp(node: TupleExpASTNode): TupleExpASTNode;
        listExp(node: ListExpASTNode): ListExpASTNode;
        piecewiseExp(node: PiecewiseExpASTNode): PiecewiseExpASTNode;
    }
}


ASTParenAdder.prototype.tupleExp = function (node: TupleExpASTNode): TupleExpASTNode {
    node = { ...node };
    node.items = node.items.map((item, i) => {
        item = this.visit(item);
        item = this.disambiguateContextAndCommas(
            item,
            false,
            ctxNode =>
                (ctxNode.type === 'forClause' || ctxNode.type === 'withClause')
                && !(i === node.items.length - 1),
            ctxExp =>
                (ctxExp.ctxKind === 'for' || ctxExp.ctxKind === 'with')
                && !(i === node.items.length - 1)
        );
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
        item = this.disambiguateContextAndCommas(
            item,
            false,
            ctxNode =>
                (ctxNode.type === 'forClause' || ctxNode.type === 'withClause')
                && !(i === node.items.length - 1)
                && !(node.items.length === 1 && ctxNode.type === 'forClause'),
            ctxExp =>
                (ctxExp.ctxKind === 'for' || ctxExp.ctxKind === 'with')
                && !(i === node.items.length - 1)
                && !(node.items.length === 1 && ctxExp.ctxKind === 'for')
        );
        return item;
    });
    return node;
}

ASTParenAdder.prototype.piecewiseExp = function (node: PiecewiseExpASTNode): PiecewiseExpASTNode {
    node = { ...node };
    node.branches = node.branches.map((branch, i) => {
        branch = this.visit(branch);

        if (branch.condition)
            branch.condition.operands = branch.condition.operands.map(operand =>
                this.disambiguateContextAndCommas(
                    operand,
                    false,
                    ctxNode => (ctxNode.type === 'forClause' || ctxNode.type === 'withClause'),
                    ctxExp => (ctxExp.ctxKind === 'for' || ctxExp.ctxKind === 'with'),
                )
            );

        if (branch.value)
            branch.value = this.disambiguateContextAndCommas(
                branch.value,
                false,
                ctxNode =>
                    (ctxNode.type === 'forClause' || ctxNode.type === 'withClause')
                    && !(i === node.branches.length - 1 && ctxNode.ctxVarDefs.length === 1 && node.default === null),
                ctxExp =>
                    (ctxExp.ctxKind === 'for' || ctxExp.ctxKind === 'with')
                    && !(i === node.branches.length - 1 && ctxExp.ctxVars.length === 1 && node.default === null)
            )

        return branch;
    });

    // default value branch is not ambiguous, so not considered

    return node;
}