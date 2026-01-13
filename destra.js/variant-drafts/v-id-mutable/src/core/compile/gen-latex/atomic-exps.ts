import { createRegExp } from "magic-regexp";
import { LatexCompiler, LatexCompilerVisitContext } from "./base";
import { AbsExpASTNode, BuiltinFuncCallASTNode, DefinedFuncCallASTNode, ListExpASTNode, ListRangeASTNode, ParenExpASTNode, TupleExpASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { PiecewiseBranchASTNode, PiecewiseExpASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/piecewise-exp";
import { BuiltinFuncASTNode, ColorHexLiteralASTNode, ConstantASTNode, ContextVarASTNode, NumberASTNode, ReservedVarASTNode, SubstitutionASTNode, UndefinedVarASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/terminals";
import { specialSymbolsAliases, specialSymbolsPaged } from "../../expr-dsl/syntax-reference/specialSymbols";
import { realnamePattern } from "../../formula/realname";
import { l } from "./latex";
import { traceSubstitution } from "../../expr-dsl/parse-ast";
import { CtxVar, Dt, Expl, Formula } from "../../formula/base";
import { CtxVarDefASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/addSub-level";
import { getState } from "../../state";

declare module './base' {
    interface LatexCompiler {

        piecewiseExp(node: PiecewiseExpASTNode, context: LatexCompilerVisitContext): string;
        piecewiseBranch(node: PiecewiseBranchASTNode, context: LatexCompilerVisitContext): string;

        builtinFuncCall(node: BuiltinFuncCallASTNode, context: LatexCompilerVisitContext): string;
        definedFuncCall(node: DefinedFuncCallASTNode, context: LatexCompilerVisitContext): string;

        parenExp(node: ParenExpASTNode, context: LatexCompilerVisitContext): string;
        tupleExp(node: TupleExpASTNode, context: LatexCompilerVisitContext): string;
        listExp(node: ListExpASTNode, context: LatexCompilerVisitContext): string;
        listRange(node: ListRangeASTNode, context: LatexCompilerVisitContext): string;
        absExp(node: AbsExpASTNode, context: LatexCompilerVisitContext): string;

        number(node: NumberASTNode): string;
        constant(node: ConstantASTNode): string;
        substitution(node: SubstitutionASTNode): string;
        builtinFunc(node: BuiltinFuncASTNode): string;
        reservedVar(node: ReservedVarASTNode): string;
        contextVar(node: ContextVarASTNode, context: LatexCompilerVisitContext): string;
        undefinedVar(node: UndefinedVarASTNode): string;
    }
}


LatexCompiler.prototype.piecewiseExp = function (node: PiecewiseExpASTNode, context: LatexCompilerVisitContext): string {
    return (
        '\\left\\{'
        + node.branches.map(b => this.visit(b, context)).join(',')
        + (node.default ? `,${this.visit(node.default, context)}` : '')
        + '\\right\\}'
    );
}

LatexCompiler.prototype.piecewiseBranch = function (node: PiecewiseBranchASTNode, context: LatexCompilerVisitContext): string {
    return (
        this.visit(node.condition, context)
        + (node.value ? `:${this.visit(node.value, context)}` : '')
    );
}

LatexCompiler.prototype.builtinFuncCall = function (node: BuiltinFuncCallASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.func, context)}\\left(${node.args.map(a => this.visit(a, context)).join(',')}\\right)`;
}

LatexCompiler.prototype.definedFuncCall = function (node: DefinedFuncCallASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.func, context)}\\left(${node.args.map(a => this.visit(a, context)).join(',')}\\right)`;
}

LatexCompiler.prototype.parenExp = function (node: ParenExpASTNode, context: LatexCompilerVisitContext): string {
    return `\\left(${this.visit(node.content, context)}\\right)`;
}
LatexCompiler.prototype.tupleExp = function (node: TupleExpASTNode, context: LatexCompilerVisitContext): string {
    return `\\left(${node.items.map(i => this.visit(i, context)).join(',')}\\right)`;
}
LatexCompiler.prototype.listExp = function (node: ListExpASTNode, context: LatexCompilerVisitContext): string {
    return `\\left[${node.items.map(i => this.visit(i, context)).join(',')}\\right]`;
}
LatexCompiler.prototype.listRange = function (node: ListRangeASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.start, context)}...${this.visit(node.end, context)}`;
}

LatexCompiler.prototype.absExp = function (node: AbsExpASTNode, context: LatexCompilerVisitContext): string {
    return `\\left|${this.visit(node.content, context)}\\right|`;
}

LatexCompiler.prototype.number = function (node: NumberASTNode): string {
    return `${
        node.base.integer ? node.base.integer : '0'
    }${
        node.base.decimal ? '.' + node.base.decimal : ''
    }`;
}
LatexCompiler.prototype.constant = function (node: ConstantASTNode): string {
    return nameForLatex(node.value);
}
LatexCompiler.prototype.substitution = function (node: SubstitutionASTNode): string {
    const f = traceSubstitution(node, this.targetFormula);
    if (!(f instanceof Formula)) {
        throw new Error(`Internal error: Substitution value is not a formula. ${f}`);
    }
    if (f instanceof Dt) {
        return l.opName('dt');
    }
    if (f instanceof CtxVar) {
        const realname = this.compileContext.ctxVarRealnameMap.get(f);
        if (!realname) {
            throw new Error(`Internal error: CtxVar has no realname. ${f}`);
        }
        return nameForLatex(realname);
    }
    if (f instanceof Expl) {   // Expl: refer by its realname
        const realname = this.compileContext.globalRealnameMap.get(f);
        if (!realname) {
            throw new Error(`Internal error: Expl has no realname. ${f}`);
        }
        return nameForLatex(realname);
    }
    return this.requestDep(f).latex;
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

LatexCompiler.prototype.reservedVar = function (node: ReservedVarASTNode): string {
    return nameForLatex(node.name);
}
LatexCompiler.prototype.contextVar = function (node: ContextVarASTNode, context: LatexCompilerVisitContext): string {
    let ctxVarDef: CtxVarDefASTNode | undefined;
    for (const scope of context.ctxScopeStack) {
        for (const def of scope) {
            if (def.name === node.name) {
                ctxVarDef = def;
                break;
            }
        }
    }
    if (!ctxVarDef) {
        throw new Error(`Internal error: Cannot find ctxVarDef for context var reference. ${node.name}`);
    }
    const realname = this.compileContext.internalCtxVarRealnameMap.get(ctxVarDef._astId);
    if (!realname) {
        throw new Error(`Internal error: CtxVarDef has no realname. ${node.name}`);
    }
    return nameForLatex(realname);
}

LatexCompiler.prototype.undefinedVar = function (node: UndefinedVarASTNode): string {
    const realname = this.compileContext.undefinedVarRealnameMap.get(node);
    if (!realname) {
        throw new Error(`Internal error: UndefinedVar has no realname. ${node.name}`);
    }
    return nameForLatex(realname);
}







// --- Helpers ---

// Greek header name -> `\\${greek}_{subscript}`
// Greek -> '\\' + greek
// 'width', 'height', 'dt' -> l.opName(name)
const backslashNeeded = specialSymbolsAliases;   // includes 'infty' & 'infinity'
const realnameRegex = createRegExp(realnamePattern);
export function nameForLatex(name: string): string {
    // combined process realnames & constant names, reserved var names, other names....
    const match = name.match(realnameRegex);
    if (match) {
        const head = match.groups.head!;
        const subscript = match.groups.subscript1 || match.groups.subscript2 || '';
        let result = head;
        if (backslashNeeded.includes(head as any)) {
            result = `\\${head}`;
        }
        if (subscript.length > 0) {
            result += `_{${subscript}}`;
        }
        return result;
    }
    if (['width', 'height', 'dt'].includes(name)) {
        return l.opName(name);
    }
    return name;
}