import { ComparisonASTNode, ComparisonOperator } from "../../expr-dsl/parse-ast/sematics/helpers";
import { BuiltinFuncCallASTNode, ParenExpASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { DivisionASTNode, ModASTNode, PowerASTNode, RootofASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { BuiltinFuncASTNode, ColorHexLiteralASTNode, NumberASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/terminals";
import { ImplicitEquationASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/top-level";
import { ASTVisitorWithDefault } from "../../expr-dsl/visit-ast/visitor-withdefault";
import { N_NumberASTNode } from "./add-parens/atomic-exp";
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

    colorHexLiteral(node: ColorHexLiteralASTNode): ColorHexLiteral_ExpandResult;

    // resolve '=='
    implicitEquation(node: ImplicitEquationASTNode): ImplicitEquationASTNode;
    comparison(node: ComparisonASTNode): ComparisonASTNode;
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



type ColorHexLiteral_ExpandResult = 
    BuiltinFuncCallASTNode & {
        func: BuiltinFuncASTNode & {
            name: 'rgb'
        }
        args: [N_NumberASTNode, N_NumberASTNode, N_NumberASTNode]
    };
ASTExpander.prototype.colorHexLiteral = function (node: ColorHexLiteralASTNode): ColorHexLiteral_ExpandResult {
    const hex = node.value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return {
        type: 'builtinFuncCall',
        func: {
            type: 'builtinFunc',
            name: 'rgb',
        },
        args: [
            {
                type: 'number',
                base: { integer: r.toString() },
                exponent: undefined,
            },
            {
                type: 'number',
                base: { integer: g.toString() },
                exponent: undefined,
            },
            {
                type: 'number',
                base: { integer: b.toString() },
                exponent: undefined,
            },
        ],
    }
}

ASTExpander.prototype.implicitEquation = function (node: ImplicitEquationASTNode): ImplicitEquationASTNode {
    return {...node, ops: node.ops.map(op => op === '==' ? '=' : op)};
}

ASTExpander.prototype.comparison = function (node: ComparisonASTNode): ComparisonASTNode {
    return {...node, operators: node.operators.map(op => op === ComparisonOperator.Equal2 ? ComparisonOperator.Equal : op)};
}