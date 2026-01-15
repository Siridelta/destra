import { ComparisonASTNode, ComparisonOperator, traceSubstitution } from "../../expr-dsl/parse-ast/sematics/helpers";
import { BuiltinFuncCallASTNode, ParenExpASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { DivisionASTNode, ModASTNode, PowerASTNode, RootofASTNode, UnaryMinusASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { BuiltinFuncASTNode, ColorHexLiteralASTNode, ConstantASTNode, NumberASTNode, SubstitutionASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/terminals";
import { ImplicitEquationASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/top-level";
import { ASTVisitorWithDefault } from "../../expr-dsl/visit-ast/visitor-withdefault";
import { Formula } from "../../formula/base";
import { throughParenGet } from "./utils";

/**
 * Expand Syntactic Sugars
 * 
 * scientific notation is delayed after mult/div rearrangement
 */
export class ASTExpander extends ASTVisitorWithDefault<any, void> {
    public targetFormula: Formula;

    constructor(targetFormula: Formula) {
        super();
        this.targetFormula = targetFormula;
    }
}

export interface ASTExpander {
    rootof(node: RootofASTNode): RootofAST_ExpandResult;
    mod(node: ModASTNode): ModAST_ExpandResult;
    parenExp(node: ParenExpASTNode): ParenExpASTNode | BuiltinFuncCallASTNode;

    colorHexLiteral(node: ColorHexLiteralASTNode): ColorHexLiteral_ExpandResult;

    // resolve '=='
    implicitEquation(node: ImplicitEquationASTNode): ImplicitEquationASTNode;
    comparison(node: ComparisonASTNode): ComparisonASTNode;


    number(node: NumberASTNode): NumberAST_ExpandResult;

    // Case that substitute a negative number. 
    // This case we must add a negative sign, equivalant to prefix expression, 
    // which **leverages** its level, hence bringing potential paren-adding requirement.
    // For negative numbers we expand it to unary-minus expr, and hand to rest part of this normalize-visitor to handle parentheses;
    // but we shall not modify the backed original value (inside template payload) to positive.
    // a visitor shall not bring side effect to template payload.
    // so this requires our later compiler to treat negative-number substitution as its absolute value, 
    // and well-known that the negative sign has been represent in AST.
    substitution(node: SubstitutionASTNode): SubstitutionASTNode | UnaryMinusASTNode | NumberAST_ExpandResult | ConstantASTNode;
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
    return { ...node, ops: node.ops.map(op => op === '==' ? '=' : op) };
}

ASTExpander.prototype.comparison = function (node: ComparisonASTNode): ComparisonASTNode {
    return { ...node, operators: node.operators.map(op => op === ComparisonOperator.Equal2 ? ComparisonOperator.Equal : op) };
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
function _number(node: NumberASTNode): NumberAST_ExpandResult {
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
ASTExpander.prototype.number = function (node: NumberASTNode): NumberAST_ExpandResult {
    if (node.exponent === undefined) return node as N_NumberASTNode;
    return this.visit(_number(node));
}

export function numberToAST(value: number): NumberAST_ExpandResult | UnaryMinusASTNode | ConstantASTNode {
    const isNeg = value < 0;
    const x = Math.abs(value);
    let node: NumberASTNode | ConstantASTNode | null = null;
    if (x === Infinity)
        node = {
            type: 'constant',
            value: 'infinity',
        }
    if (x.toString().includes('e')) {
        const [base, exponent] = x.toString().split('e');
        const [integer, decimal] = base.split('.');
        node = {
            type: 'number',
            base: { integer: base, decimal: decimal },
            exponent: {
                sign: exponent.startsWith('-') ? '-' : undefined,
                integer: exponent.slice(1),
            },
        }
    } else {
        const [integer, decimal] = x.toString().split('.');
        node = {
            type: 'number',
            base: { integer: integer, decimal: decimal },
            exponent: undefined,
        }
    }
    let expandedNode: NumberAST_ExpandResult | ConstantASTNode | UnaryMinusASTNode | null = null;
    if (node.type === 'number')
        expandedNode = _number(node);
    else
        expandedNode = node;
    if (isNeg)
        return {
            type: 'unaryMinus',
            operand: expandedNode,
        };
    return expandedNode;
}

ASTExpander.prototype.substitution = function (node: SubstitutionASTNode): SubstitutionASTNode | UnaryMinusASTNode | NumberAST_ExpandResult | ConstantASTNode {
    const f = traceSubstitution(node, this.targetFormula);
    if (f instanceof Formula)
        return node;
    if (typeof f !== 'number')
        throw new Error(`Internal error: Substitution value is not a number. ${f}`);
    return this.visit(numberToAST(f));
}