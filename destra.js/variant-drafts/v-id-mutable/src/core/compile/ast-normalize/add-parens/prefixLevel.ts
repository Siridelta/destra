import { ASTParenAdder } from ".";
import { isUpToAddSubLevelASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/addSub-level";
import { ContextType1ASTNode, DiffClauseASTNode, IntClauseASTNode, ProdClauseASTNode, SumClauseASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/context-type1";
import { isUpToMultDivLevelASTNode, isUpToPrefixLevelASTNode, PowerASTNode, PrefixLevelASTNode, RootofASTNode, UnaryMinusASTNode, UnaryPlusASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { AttrAccessASTNode, ExtensionFuncCallASTNode, FactorialASTNode, isUpToPostfixLevelASTNode, ListFilteringASTNode, ListIndexingASTNode, ListSlicingASTNode, PostfixLevelASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/postfix-level";
import { wrapWithParentheses } from "../utils";

declare module '.' {
    interface ASTParenAdder {

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


ASTParenAdder.prototype.unaryMinus = function (node: UnaryMinusASTNode): UnaryMinusASTNode { return this.prefixLevel(node); }
ASTParenAdder.prototype.unaryPlus = function (node: UnaryPlusASTNode): UnaryPlusASTNode { return this.prefixLevel(node); }
ASTParenAdder.prototype.prefixLevel = function <T extends PrefixLevelASTNode>(node: T): T {
    node = { ...node };
    node.operand = this.visit(node.operand);
    if (!isUpToPrefixLevelASTNode(node.operand)) {
        node.operand = wrapWithParentheses(node.operand);
    }
    return node;
}

ASTParenAdder.prototype.rootof = function (node: RootofASTNode): RootofASTNode { throw new Error('Internal Error: RootofASTNode should had been expanded to a^(1/n)'); }

// huh, pretty strange here.
// in desmos the power exponent is actually a pretty safe place, so I consider it be addSubLevel safe
// but for the base apart from being not beyond power level safe, it itself cannot even be powerExp itself
// cuz power is right associative and having base being a powerExp is to have left-associative structure
// but in desmos you cannot made it, without parentheses it always resolves right-associative
// so we have to wrap it here
ASTParenAdder.prototype.power = function (node: PowerASTNode): PowerASTNode {
    node = { ...node };
    node.base = this.visit(node.base);
    node.exponent = this.visit(node.exponent);
    if (!isUpToPostfixLevelASTNode(node.base)) {
        node.base = wrapWithParentheses(node.base);
    }
    if (!isUpToAddSubLevelASTNode(node.exponent)) {
        node.exponent = wrapWithParentheses(node.exponent);
    }
    return node;
}

ASTParenAdder.prototype.factorial = function (node: FactorialASTNode): FactorialASTNode { return this.postfixLevel(node); }
ASTParenAdder.prototype.attrAccess = function (node: AttrAccessASTNode): AttrAccessASTNode { return this.postfixLevel(node); }
ASTParenAdder.prototype.extensionFuncCall = function (node: ExtensionFuncCallASTNode): ExtensionFuncCallASTNode { return this.postfixLevel(node); }
ASTParenAdder.prototype.listFiltering = function (node: ListFilteringASTNode): ListFilteringASTNode { return this.postfixLevel(node); }
ASTParenAdder.prototype.listIndexing = function (node: ListIndexingASTNode): ListIndexingASTNode { return this.postfixLevel(node); }
ASTParenAdder.prototype.listSlicing = function (node: ListSlicingASTNode): ListSlicingASTNode { return this.postfixLevel(node); }
ASTParenAdder.prototype.postfixLevel = function <T extends PostfixLevelASTNode>(node: T): T {
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

ASTParenAdder.prototype.sumClause = function (node: SumClauseASTNode): SumClauseASTNode { return this.contextType1(node); }
ASTParenAdder.prototype.prodClause = function (node: ProdClauseASTNode): ProdClauseASTNode { return this.contextType1(node); }
ASTParenAdder.prototype.intClause = function (node: IntClauseASTNode): IntClauseASTNode { return this.contextType1(node); }
ASTParenAdder.prototype.diffClause = function (node: DiffClauseASTNode): DiffClauseASTNode { return this.contextType1(node); }
ASTParenAdder.prototype.contextType1 = function <T extends ContextType1ASTNode>(node: T): T {
    node = { ...node };
    node.content = this.visit(node.content);
    if (!isUpToMultDivLevelASTNode(node.content)) {
        node.content = wrapWithParentheses(node.content);
    }
    return node;
}

