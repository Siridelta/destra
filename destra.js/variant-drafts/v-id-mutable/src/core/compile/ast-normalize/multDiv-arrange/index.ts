import { BuiltinFuncCallASTNode, ParenExpASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { CrossASTNode, DivisionASTNode, ImplicitMultASTNode, MultiplicationASTNode, OmittedCallASTNode, PercentOfASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { ASTVisitorWithDefault } from "../../../expr-dsl/visit-ast/visitor-withdefault";
import { Formula } from "../../../formula/base";
import { CompileContext } from "../../types";
import { wrapWithParentheses } from "../utils";

/**
 * Normalize batch 2: chunked process mult/div/IM chunks
 * in visit (field based dispatch) level we only mark top nodes (except division, it unwraps children's parentheses), 
 * and if marks went stationary, we dispatch it to chunkTop function to start a chunked processing
 */
export type MultDivArrangerContext = {
    chunkTops: Set<MultDivChunkNode | ParenExpASTNode>;
    backTracking: boolean;
}
export class MultDivArranger extends ASTVisitorWithDefault<any, MultDivArrangerContext> {
    public compileContext: CompileContext;
    public targetFormula: Formula;

    constructor(compileContext: CompileContext, targetFormula: Formula) {
        super();
        this.compileContext = compileContext;
        this.targetFormula = targetFormula;
    }

    public visit(
        node: any,
        parentContext: MultDivArrangerContext = { chunkTops: new Set<MultDivChunkNode | ParenExpASTNode>(), backTracking: false }
    ): any {
        if (!parentContext.backTracking) {

            const context = { ...parentContext, chunkTops: new Set<MultDivChunkNode | ParenExpASTNode>(parentContext.chunkTops) };
            node = super.visit(node, context);

            if (context.chunkTops.has(node)) {
                parentContext.chunkTops.add(node);
            } else {
                node = this.default(node, { ...context, backTracking: true });
            }

            return node;

        } else {
            if (parentContext.chunkTops.has(node)) {
                return this.backTrack(node);
            }
        }
    }
}

type I1 = MultiplicationASTNode | DivisionASTNode | PercentOfASTNode;
export interface MultDivArranger {

    multiplication(node: MultiplicationASTNode, context: MultDivArrangerContext): MultiplicationASTNode;
    division(node: DivisionASTNode, context: MultDivArrangerContext): DivisionASTNode;
    percentOf(node: PercentOfASTNode, context: MultDivArrangerContext): PercentOfASTNode;
    multDivLevel<T extends I1>(node: T, context: MultDivArrangerContext): T;

    // always wrap cross
    cross(node: CrossASTNode, context: MultDivArrangerContext): ParenExpASTNode;
    // temporarily always turn omitted call into builtin func call
    omittedCall(node: OmittedCallASTNode, context: MultDivArrangerContext): BuiltinFuncCallASTNode;

    implicitMult(node: ImplicitMultASTNode, context: MultDivArrangerContext): ImplicitMultASTNode;

    parenExp(node: ParenExpASTNode, context: MultDivArrangerContext): ParenExpASTNode;
    
    backTrack(node: MultDivChunkNode | ParenExpASTNode): MultDivChunkNode | ParenExpASTNode;
    chunkTop(node: MultDivChunkNode): MultDivChunkNode;
}


export type MultDivChunkNode =
    | MultiplicationASTNode
    | DivisionASTNode
    | PercentOfASTNode
    | ImplicitMultASTNode;

export function isMultDivChunkNode(node: any): node is MultDivChunkNode {
    return node.type === 'multiplication' || node.type === 'division' || node.type === 'percentOf' || node.type === 'implicitMult';
}

// In this batch we only pass top tags to idenfity chunked-processing entrypoints in the next batch.
MultDivArranger.prototype.multiplication = function (node: MultiplicationASTNode, context: MultDivArrangerContext): MultiplicationASTNode { return this.multDivLevel(node, context); }
MultDivArranger.prototype.division = function (node: DivisionASTNode, context: MultDivArrangerContext): DivisionASTNode { return this.multDivLevel(node, context); }
MultDivArranger.prototype.percentOf = function (node: PercentOfASTNode, context: MultDivArrangerContext): PercentOfASTNode { return this.multDivLevel(node, context); }
MultDivArranger.prototype.multDivLevel = function <T extends I1>(node: T, context: MultDivArrangerContext): T {

    node.left = this.visit(node.left, context);
    node.right = this.visit(node.right, context);

    if (
        (
            isMultDivChunkNode(node.left) 
            || (node.left.type === 'parenExp' && node.type === 'division')
        )
        && context.chunkTops.has(node.left)
    )
        context.chunkTops.add(node);

    if (
        (
            isMultDivChunkNode(node.right) 
            || (node.right.type === 'parenExp' && node.type === 'division')
        )
        && context.chunkTops.has(node.right)
    )
        context.chunkTops.add(node);

    return node;
}

MultDivArranger.prototype.implicitMult = function (node: ImplicitMultASTNode, context: MultDivArrangerContext): ImplicitMultASTNode {

    node.operands = node.operands.map(operand => {
        operand = this.visit(operand, context);

        if (isMultDivChunkNode(operand) && context.chunkTops.has(operand))
            context.chunkTops.add(node);

        return operand;
    });
    return node;
}

MultDivArranger.prototype.parenExp = function (node: ParenExpASTNode, context: MultDivArrangerContext): ParenExpASTNode {
    node.content = this.visit(node.content, context);
    if ((isMultDivChunkNode(node.content) || node.content.type === 'parenExp') && context.chunkTops.has(node.content))
        context.chunkTops.add(node);
    return node;
}

MultDivArranger.prototype.cross = function (node: CrossASTNode, context: MultDivArrangerContext): ParenExpASTNode {
    node.left = this.visit(node.left, context);
    node.right = this.visit(node.right, context);
    return wrapWithParentheses(node);
}

MultDivArranger.prototype.omittedCall = function (node: OmittedCallASTNode, context: MultDivArrangerContext): BuiltinFuncCallASTNode {
    node.func = this.visit(node.func, context);
    node.arg = this.visit(node.arg, context);
    return {
        type: 'builtinFuncCall',
        func: node.func,
        args: [node.arg],
    };
}

// --- Chunked processing ---

MultDivArranger.prototype.backTrack = function (node: MultDivChunkNode | ParenExpASTNode): MultDivChunkNode | ParenExpASTNode {
    if (node.type === 'parenExp') {
        return { ...node, content: this.backTrack(node.content) };
    }
    return this.chunkTop(node);
}

MultDivArranger.prototype.chunkTop = function (node: MultDivChunkNode): MultDivChunkNode {
    const ir = this.toIR(node);
    const collapsed = this.collapse(ir);

    const fractioned = this.determineFraction(collapsed);
    const collapsed2 = this.collapse_MultOnly(fractioned);



    return node;
}

import './collapse';
