import { BuiltinFuncCallASTNode, ParenExpASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { DivisionASTNode, ModASTNode, PowerASTNode, RootofASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { BuiltinFuncASTNode, NumberASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/terminals";
import { ASTVisitorWithDefault } from "../../expr-dsl/visit-ast/visitor-withdefault";
import { throughParenGet } from "./utils";

/**
 * Expand Syntactic Sugars
 * 
 * scientific notation is delayed after mult/div rearrangement
 */
export class ASTExpander extends ASTVisitorWithDefault<any, void> {

}

export interface ASTExpander {
    rootof(node: RootofASTNode): RootofAST_ExpandResult;
    mod(node: ModASTNode): ModAST_ExpandResult;
    parenExp(node: ParenExpASTNode): ParenExpASTNode | BuiltinFuncCallASTNode;
}


type RootofAST_ExpandResult = 
    PowerASTNode & {
        base: NumberASTNode
        exponent: DivisionASTNode & {
            left: NumberASTNode & {
                base: { integer: '1', decimal: undefined }
            }
            right: any
        }
    };
ASTExpander.prototype.rootof = function (node: RootofASTNode): RootofAST_ExpandResult {
    return {
        type: 'power',
        base: node.operand,
        exponent: {
            type: 'division',
            left: {
                type: 'number',
                base: { integer: '1', decimal: undefined },
            },
            right: node.index,
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
        args: [
            throughParenGet(this.visit(node.left)), 
            throughParenGet(this.visit(node.right))
        ],
    }
}
// Special cooperation to clear the wrapping parentheses of mod which is possibly very common in its usage in destra
// after converting to a function call, keeping a parentheses is somehow ugly
ASTExpander.prototype.parenExp = function (node: ParenExpASTNode): ParenExpASTNode | BuiltinFuncCallASTNode {
    if (node.content.type === 'mod')
        return this.visit(node.content);
    node.content = this.visit(node.content);
    return node;
}
