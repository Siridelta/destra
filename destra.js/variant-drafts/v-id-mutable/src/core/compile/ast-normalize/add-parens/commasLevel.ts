import { ASTParenAdder } from "./base";
import { AdditionASTNode, AddSubLevelASTNode, ContextType2LevelASTNode, ForClauseASTNode, isAddSubLevelASTNode, isContextType2LevelASTNode, isUpToAddSubLevelASTNode, isUpToContextType2LevelASTNode, SubtractionASTNode, WithClauseASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/addSub-level";
import { CommasASTNode, isActionASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/commas-level";
import { isUpToMultDivLevelASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { traceWithSubst, wrapWithParentheses } from "../utils";
import { CrossASTNode, DivisionASTNode, MultDivLevelASTNode, MultiplicationASTNode, PercentOfASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { CtxClauseASTNode, isCtxClause } from "../../../expr-dsl/parse-ast";
import { CtxExp, Formula } from "../../../formula/base";

declare module './base' {
    interface ASTParenAdder {

        disambiguateContextAndCommas(node: any, passive: boolean, ctxNodePredicate: (ctxNode: CtxClauseASTNode) => boolean, ctxExpPredicate: (ctxExp: CtxExp) => boolean): any;

        commasLevel(node: CommasASTNode): CommasASTNode;

        addition(node: AdditionASTNode): AdditionASTNode;
        subtraction(node: SubtractionASTNode): SubtractionASTNode;
        addSubLevel<T extends AddSubLevelASTNode>(node: T): T;

        forClause(node: ForClauseASTNode): ForClauseASTNode;
        withClause(node: WithClauseASTNode): WithClauseASTNode;
        contextType2Level<T extends ContextType2LevelASTNode>(node: T): T;

        multiplication(node: MultiplicationASTNode): MultiplicationASTNode;
        division(node: DivisionASTNode): DivisionASTNode;
        cross(node: CrossASTNode): CrossASTNode;
        percentOf(node: PercentOfASTNode): PercentOfASTNode;
        multDivLevel<T extends MultDivLevelASTNode>(node: T): T;

        // implicit mult paren-adding has been advanced to multDiv-arrange batch

    }
}

ASTParenAdder.prototype.disambiguateContextAndCommas = function (
    node: any, 
    passive: boolean,
    ctxNodePredicate: (ctxNode: CtxClauseASTNode) => boolean,
    ctxExpPredicate: (ctxExp: CtxExp) => boolean
): any {

    // If we are checking inside a dependency formula, not our current processing formula,
    // we shall not alter its AST, and we could only be 'passive'.
    // If there are cases the dep formula's corresponding Normalizer would handle, leave and let it handle.
    // Else, we only parenthize the substitution node in our current formula.
    if (isActionASTNode(node)) {
        const result = this.disambiguateContextAndCommas(node.value, passive, ctxNodePredicate, ctxExpPredicate);
        if (passive) return result;
        return {
            ...node,
            value: result
        };
    }
    if (isAddSubLevelASTNode(node)) {
        const leftResult = this.disambiguateContextAndCommas(node.left, passive, ctxNodePredicate, ctxExpPredicate);
        const rightResult = this.disambiguateContextAndCommas(node.right, passive, ctxNodePredicate, ctxExpPredicate);
        if (passive) return leftResult && rightResult;
        return {
            ...node,
            left: leftResult,
            right: rightResult
        };
    }
    if (isCtxClause(node)) {
        const isAmbiguous = ctxNodePredicate(node);
        if (passive) return isAmbiguous;
        if (isAmbiguous) {
            return wrapWithParentheses(node);
        }
    }
    if (node.type === 'substitution') {
        if (traceWithSubst(
            node,
            (node: any) => this.disambiguateContextAndCommas(node, true, ctxNodePredicate, ctxExpPredicate),
            {
                onNonFormula: () => false,
                onCtxExp: f => ctxExpPredicate(f),
                onNoAst: () => false,
                hostFormula: this.targetFormula,
            }
        ) === true) {
            if (passive)
                return true;
            else
                return wrapWithParentheses(node);
        }
    }
    return node;
}

// prevent ambiguity of comma usage in for/with clauses and action-batch expressions
ASTParenAdder.prototype.commasLevel = function (node: CommasASTNode): CommasASTNode {
    node = { ...node };
    node.items = node.items
        .map(item => this.visit(item))
        .map((item, i) => this.disambiguateContextAndCommas(
            item, 
            false,
            ctxNode => 
                (ctxNode.type === 'forClause' || ctxNode.type === 'withClause') 
                && !(i === node.items.length - 1 && ctxNode.ctxVarDefs.length === 1),
            ctxExp => 
                (ctxExp.ctxKind === 'for' || ctxExp.ctxKind === 'with') 
                && !(i === node.items.length - 1 && ctxExp.ctxVars.length === 1),
        ));
    return node;
}

ASTParenAdder.prototype.addition = function (node: AdditionASTNode): AdditionASTNode { return this.addSubLevel(node); }
ASTParenAdder.prototype.subtraction = function (node: SubtractionASTNode): SubtractionASTNode { return this.addSubLevel(node); }
ASTParenAdder.prototype.addSubLevel = function <T extends AddSubLevelASTNode>(node: T): T {
    node = { ...node };
    node.left = this.visit(node.left);
    node.right = this.visit(node.right);
    if (!this.checkLevelWithSubst(node.left, isUpToAddSubLevelASTNode)) {
        node.left = wrapWithParentheses(node.left);
    }
    if (!this.checkLevelWithSubst(node.right, isUpToContextType2LevelASTNode)) {
        node.right = wrapWithParentheses(node.right);
    }
    return node;
}

ASTParenAdder.prototype.forClause = function (node: ForClauseASTNode): ForClauseASTNode { return this.contextType2Level(node); }
ASTParenAdder.prototype.withClause = function (node: WithClauseASTNode): WithClauseASTNode { return this.contextType2Level(node); }
ASTParenAdder.prototype.contextType2Level = function <T extends ContextType2LevelASTNode>(node: T): T {
    node = { ...node };

    node.content = this.visit(node.content);
    if (!this.checkLevelWithSubst(node.content, isUpToMultDivLevelASTNode)) {
        node.content = wrapWithParentheses(node.content);
    }

    node.ctxVarDefs = node.ctxVarDefs.map(ctxVarDef => {
        ctxVarDef = { ...ctxVarDef, expr: this.visit(ctxVarDef.expr) };
        if (!this.checkLevelWithSubst(ctxVarDef.expr, isUpToMultDivLevelASTNode)) {
            ctxVarDef.expr = wrapWithParentheses(ctxVarDef.expr);
        }
        return ctxVarDef;
    });

    return node;
}

ASTParenAdder.prototype.multiplication = function (node: MultiplicationASTNode): MultiplicationASTNode { return this.multDivLevel(node); }
ASTParenAdder.prototype.division = function (node: DivisionASTNode): DivisionASTNode { return this.multDivLevel(node); }
ASTParenAdder.prototype.cross = function (node: CrossASTNode): CrossASTNode { return node; }
ASTParenAdder.prototype.percentOf = function (node: PercentOfASTNode): PercentOfASTNode { return node; }
ASTParenAdder.prototype.multDivLevel = function <T extends MultDivLevelASTNode>(node: T): T {
    node = { ...node };
    node.left = this.visit(node.left);
    node.right = this.visit(node.right);
    if (!this.checkLevelWithSubst(node.left, isUpToMultDivLevelASTNode)) {
        node.left = wrapWithParentheses(node.left);
    }
    if (!this.checkLevelWithSubst(node.right, isUpToMultDivLevelASTNode)) {
        node.right = wrapWithParentheses(node.right);
    }
    return node;
}