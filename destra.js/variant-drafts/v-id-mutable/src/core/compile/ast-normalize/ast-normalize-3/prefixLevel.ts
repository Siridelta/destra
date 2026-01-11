import { ASTNormalizer3 } from ".";
import { wrapWithParentheses } from "../utils";
import { isUpToMultDivLevelASTNode, isUpToPowerLevelASTNode, isUpToPrefixLevelASTNode, isUpToRootofLevelASTNode, PowerASTNode, PrefixLevelASTNode, RootofASTNode, UnaryMinusASTNode, UnaryPlusASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { AttrAccessASTNode, ExtensionFuncCallASTNode, FactorialASTNode, isUpToPostfixLevelASTNode, ListFilteringASTNode, ListIndexingASTNode, ListSliceRangeASTNode, ListSlicingASTNode, PostfixLevelASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/postfix-level";
import { getASTChildPaths, getChildByPath, setChildByPath } from "../../../expr-dsl/parse-ast/sematics/traverse-ast";
import { ContextType1ASTNode, DiffClauseASTNode, IntClauseASTNode, ProdClauseASTNode, SumClauseASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/context-type1";

declare module '.' {
    interface ASTNormalizer3 {

        unaryMinus(node: UnaryMinusASTNode): UnaryMinusASTNode;
        unaryPlus(node: UnaryPlusASTNode): UnaryPlusASTNode;
        prefixLevel<T extends PrefixLevelASTNode>(node: T): T;

        rootof(node: RootofASTNode): RootofASTNode;

        power(node: PowerASTNode): PowerASTNode;

        factorial(node: FactorialASTNode): FactorialASTNode;
        attrAccess(node: AttrAccessASTNode): AttrAccessASTNode;
        extensionFuncCall(node: ExtensionFuncCallASTNode): ExtensionFuncCallASTNode;
        listFiltering(node: ListFilteringASTNode): ListFilteringASTNode;
        listIndexing(node: ListIndexingASTNode): ListIndexingASTNode;
        listSlicing(node: ListSlicingASTNode): ListSlicingASTNode;
        postfixLevel<T extends PostfixLevelASTNode>(node: T): T;

        sumClause(node: SumClauseASTNode): SumClauseASTNode;
        prodClause(node: ProdClauseASTNode): ProdClauseASTNode;
        intClause(node: IntClauseASTNode): IntClauseASTNode;
        diffClause(node: DiffClauseASTNode): DiffClauseASTNode;
        contextType1<T extends ContextType1ASTNode>(node: T): T;
    }
}


ASTNormalizer3.prototype.unaryMinus = function (node: UnaryMinusASTNode): UnaryMinusASTNode { return this.prefixLevel(node); }
ASTNormalizer3.prototype.unaryPlus = function (node: UnaryPlusASTNode): UnaryPlusASTNode { return this.prefixLevel(node); }
ASTNormalizer3.prototype.prefixLevel = function <T extends PrefixLevelASTNode>(node: T): T {
    node = { ...node };
    node.operand = this.visit(node.operand);
    if (!isUpToPrefixLevelASTNode(node.operand)) {
        node.operand = wrapWithParentheses(node.operand);
    }
    return node;
}

ASTNormalizer3.prototype.rootof = function (node: RootofASTNode): RootofASTNode { throw new Error('Internal Error: RootofASTNode should had been expanded to a^(1/n)'); }

ASTNormalizer3.prototype.power = function (node: PowerASTNode): PowerASTNode {
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

ASTNormalizer3.prototype.factorial = function (node: FactorialASTNode): FactorialASTNode { return this.postfixLevel(node); }
ASTNormalizer3.prototype.attrAccess = function (node: AttrAccessASTNode): AttrAccessASTNode { return this.postfixLevel(node); }
ASTNormalizer3.prototype.extensionFuncCall = function (node: ExtensionFuncCallASTNode): ExtensionFuncCallASTNode { return this.postfixLevel(node); }
ASTNormalizer3.prototype.listFiltering = function (node: ListFilteringASTNode): ListFilteringASTNode { return this.postfixLevel(node); }
ASTNormalizer3.prototype.listIndexing = function (node: ListIndexingASTNode): ListIndexingASTNode { return this.postfixLevel(node); }
ASTNormalizer3.prototype.listSlicing = function (node: ListSlicingASTNode): ListSlicingASTNode { return this.postfixLevel(node); }
ASTNormalizer3.prototype.postfixLevel = function <T extends PostfixLevelASTNode>(node: T): T {
    node = { ...node };
    let child = node.type === 'extensionFuncCall' ? node.receiver : node.operand;
    child = this.visit(child);
    if (!isUpToPostfixLevelASTNode(child)) {
        child = wrapWithParentheses(child);
    }
    if (node.type === 'extensionFuncCall') {
        node.receiver = child;
    } else {
        node.operand = child;
    }
    return node;
}

ASTNormalizer3.prototype.sumClause = function (node: SumClauseASTNode): SumClauseASTNode { return this.contextType1(node); }
ASTNormalizer3.prototype.prodClause = function (node: ProdClauseASTNode): ProdClauseASTNode { return this.contextType1(node); }
ASTNormalizer3.prototype.intClause = function (node: IntClauseASTNode): IntClauseASTNode { return this.contextType1(node); }
ASTNormalizer3.prototype.diffClause = function (node: DiffClauseASTNode): DiffClauseASTNode { return this.contextType1(node); }
ASTNormalizer3.prototype.contextType1 = function <T extends ContextType1ASTNode>(node: T): T {
    node = { ...node };
    node.content = this.visit(node.content);
    if (!isUpToMultDivLevelASTNode(node.content)) {
        node.content = wrapWithParentheses(node.content);
    }
    return node;
}

