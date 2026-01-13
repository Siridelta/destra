import { LatexCompiler } from ".";
import { PiecewiseBranchASTNode, PiecewiseExpASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/piecewise-exp";
import { BuiltinFuncASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/terminals";
import { l } from "./latex";

declare module '.' {
    interface LatexCompiler {

        piecewiseExp(node: PiecewiseExpASTNode): string;
        piecewiseBranch(node: PiecewiseBranchASTNode): string;


        builtinFunc(node: BuiltinFuncASTNode): string;





    }
}


LatexCompiler.prototype.piecewiseExp = function (node: PiecewiseExpASTNode): string {
    return (
        '\\left\\{'
        + node.branches.map(b => this.visit(b)).join(',')
        + (node.default ? `,${this.visit(node.default)}` : '')
        + '\\right\\}'
    );
}

LatexCompiler.prototype.piecewiseBranch = function (node: PiecewiseBranchASTNode): string {
    return (
        this.visit(node.condition)
        + (node.value ? `:${this.visit(node.value)}` : '')
    );
}

















const noOpNameCmdFuncs = [
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
    'arcsin', 'arccos', 'arctan', 'arccot', 'arcsec', 'arccsc',
    'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch',
];

LatexCompiler.prototype.builtinFunc = function (node: BuiltinFuncASTNode): string {
    if (noOpNameCmdFuncs.includes(node.name)) {
        return `\\${node.name}`;
    }
    return l.opName(node.name);
}

