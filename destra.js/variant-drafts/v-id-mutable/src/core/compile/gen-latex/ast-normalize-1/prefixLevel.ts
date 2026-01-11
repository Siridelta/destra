import { ASTNormalizer1, wrapWithParentheses } from ".";
import { isUpToPowerLevelASTNode, isUpToPrefixLevelASTNode, isUpToRootofLevelASTNode, PowerASTNode, PrefixLevelASTNode, RootofASTNode, UnaryMinusASTNode, UnaryPlusASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";

declare module '.' {
    interface ASTNormalizer1 {

        unaryMinus(node: UnaryMinusASTNode): UnaryMinusASTNode;
        unaryPlus(node: UnaryPlusASTNode): UnaryPlusASTNode;
        prefixLevel<T extends PrefixLevelASTNode>(node: T): T;

        rootof(node: RootofASTNode): RootofASTNode;

        power(node: PowerASTNode): PowerASTNode;
        
    }
}


ASTNormalizer1.prototype.unaryMinus = function (node: UnaryMinusASTNode): UnaryMinusASTNode { return this.prefixLevel(node); }
ASTNormalizer1.prototype.unaryPlus = function (node: UnaryPlusASTNode): UnaryPlusASTNode { return this.prefixLevel(node); }
ASTNormalizer1.prototype.prefixLevel = function <T extends PrefixLevelASTNode>(node: T): T {
    node = { ...node };
    node.operand = this.visit(node.operand);
    if (!isUpToPrefixLevelASTNode(node.operand)) {
        node.operand = wrapWithParentheses(node.operand);
    }
    return node;
}

ASTNormalizer1.prototype.rootof = function (node: RootofASTNode): RootofASTNode { throw new Error('Internal Error: RootofASTNode should had been expanded to a^(1/n)'); }

ASTNormalizer1.prototype.power = function (node: PowerASTNode): PowerASTNode {
    node = { ...node };
    node.base = this.visit(node.base);
    node.exponent = this.visit(node.exponent);
    if (!isUpToPowerLevelASTNode(node.base)) {
        node.base = wrapWithParentheses(node.base);
    }
    if (!isUpToPowerLevelASTNode(node.exponent)) {
        node.exponent = wrapWithParentheses(node.exponent);
    }
    return node;
}

AST