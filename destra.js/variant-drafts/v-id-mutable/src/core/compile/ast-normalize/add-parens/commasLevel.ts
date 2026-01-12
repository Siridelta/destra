import { ASTParenAdder } from ".";
import { wrapWithParentheses } from "../utils";
import { AdditionASTNode, AddSubLevelASTNode, ContextType2LevelASTNode, ForClauseASTNode, isAddSubLevelASTNode, isContextType2LevelASTNode, isUpToAddSubLevelASTNode, isUpToContextType2LevelASTNode, SubtractionASTNode, WithClauseASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/addSub-level";
import { CommasASTNode, isActionASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/commas-level";
import { isUpToMultDivLevelASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";

declare module '.' {
    interface ASTParenAdder {

        commasLevel(node: CommasASTNode): CommasASTNode;
    
        addition(node: AdditionASTNode): AdditionASTNode;
        subtraction(node: SubtractionASTNode): SubtractionASTNode;
        addSubLevel<T extends AddSubLevelASTNode>(node: T): T;
    
        forClause(node: ForClauseASTNode): ForClauseASTNode;
        withClause(node: WithClauseASTNode): WithClauseASTNode;
        contextType2Level<T extends ContextType2LevelASTNode>(node: T): T;

    }
}

// prevent ambiguity of comma usage in for/with clauses and action-batch expressions
ASTParenAdder.prototype.commasLevel = function (node: CommasASTNode): CommasASTNode {
    node = { ...node };
    node.items = node.items.map(item => this.visit(item));
    const traverse = (node: any) => {
        node = { ...node };
        if (isActionASTNode(node)) {
            node.value = traverse(node.value);
        }
        if (isAddSubLevelASTNode(node)) {
            node.left = traverse(node.left);
            node.right = traverse(node.right);
        }
        if (isContextType2LevelASTNode(node)) {
            if (node.ctxVarDefs.length > 1) {
                node = wrapWithParentheses(node);
            }
        }
        return node;
    }
    node.items = node.items.map(item => traverse(item));
    return node;
}

ASTParenAdder.prototype.addition = function (node: AdditionASTNode): AdditionASTNode { return this.addSubLevel(node); }
ASTParenAdder.prototype.subtraction = function (node: SubtractionASTNode): SubtractionASTNode { return this.addSubLevel(node); }
ASTParenAdder.prototype.addSubLevel = function <T extends AddSubLevelASTNode>(node: T): T {
    node = { ...node };
    node.left = this.visit(node.left);
    node.right = this.visit(node.right);
    if (!isUpToAddSubLevelASTNode(node.left)) {
        node.left = wrapWithParentheses(node.left);
    }
    if (!isUpToContextType2LevelASTNode(node.right)) {
        node.right = wrapWithParentheses(node.right);
    }
    return node;
}

ASTParenAdder.prototype.forClause = function (node: ForClauseASTNode): ForClauseASTNode { return this.contextType2Level(node); }
ASTParenAdder.prototype.withClause = function (node: WithClauseASTNode): WithClauseASTNode { return this.contextType2Level(node); }
ASTParenAdder.prototype.contextType2Level = function <T extends ContextType2LevelASTNode>(node: T): T {
    node = { ...node };

    node.content = this.visit(node.content);
    if (!isUpToMultDivLevelASTNode(node.content)) {
        node.content = wrapWithParentheses(node.content);
    }

    node.ctxVarDefs = node.ctxVarDefs.map(ctxVarDef => {
        ctxVarDef = { ...ctxVarDef, expr: this.visit(ctxVarDef.expr) };
        if (!isUpToMultDivLevelASTNode(ctxVarDef.expr)) {
            ctxVarDef.expr = wrapWithParentheses(ctxVarDef.expr);
        }
        return ctxVarDef;
    });

    return node;
}