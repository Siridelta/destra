import { LatexCompiler, LatexCompilerVisitContext } from ".";
import { ComparisonASTNode } from "../../expr-dsl/parse-ast/sematics/helpers";
import { AdditionASTNode, ForClauseASTNode, SubtractionASTNode, WithClauseASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/addSub-level";
import { DiffClauseASTNode, IntClauseASTNode, ProdClauseASTNode, SumClauseASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/context-type1";
import { CrossASTNode, DivisionASTNode, ImplicitMultASTNode, MultiplicationASTNode, OmittedCallASTNode, PercentOfASTNode, PowerASTNode, UnaryMinusASTNode, UnaryPlusASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { AttrAccessASTNode, ExtensionFuncCallASTNode, FactorialASTNode, ListFilteringASTNode, ListIndexingASTNode, ListSliceRangeASTNode, ListSlicingASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/postfix-level";
import { l } from "./latex";

declare module '.' {
    interface LatexCompiler {
        addition(node: AdditionASTNode, context: LatexCompilerVisitContext): string;
        subtraction(node: SubtractionASTNode, context: LatexCompilerVisitContext): string;

        forClause(node: ForClauseASTNode, context: LatexCompilerVisitContext): string;
        withClause(node: WithClauseASTNode, context: LatexCompilerVisitContext): string;

        multiplication(node: MultiplicationASTNode, context: LatexCompilerVisitContext): string;
        division(node: DivisionASTNode, context: LatexCompilerVisitContext): string;
        cross(node: CrossASTNode, context: LatexCompilerVisitContext): string;
        percentOf(node: PercentOfASTNode, context: LatexCompilerVisitContext): string;
        omittedCall(node: OmittedCallASTNode, context: LatexCompilerVisitContext): string;
        implicitMult(node: ImplicitMultASTNode, context: LatexCompilerVisitContext): string;

        unaryMinus(node: UnaryMinusASTNode, context: LatexCompilerVisitContext): string;
        unaryPlus(node: UnaryPlusASTNode, context: LatexCompilerVisitContext): string;
        power(node: PowerASTNode, context: LatexCompilerVisitContext): string;

        factorial(node: FactorialASTNode, context: LatexCompilerVisitContext): string;
        attrAccess(node: AttrAccessASTNode, context: LatexCompilerVisitContext): string;
        extensionFuncCall(node: ExtensionFuncCallASTNode, context: LatexCompilerVisitContext): string;
        listFiltering(node: ListFilteringASTNode, context: LatexCompilerVisitContext): string;
        listIndexing(node: ListIndexingASTNode, context: LatexCompilerVisitContext): string;
        listSlicing(node: ListSlicingASTNode, context: LatexCompilerVisitContext): string;
        listSliceRange(node: ListSliceRangeASTNode, context: LatexCompilerVisitContext): string;

        comparison(node: ComparisonASTNode, context: LatexCompilerVisitContext): string;

        sum(node: SumClauseASTNode, context: LatexCompilerVisitContext): string;
        prod(node: ProdClauseASTNode, context: LatexCompilerVisitContext): string;
        int(node: IntClauseASTNode, context: LatexCompilerVisitContext): string;
        diff(node: DiffClauseASTNode, context: LatexCompilerVisitContext): string;
    }
}

LatexCompiler.prototype.addition = function (node: AdditionASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.left, context)}+${this.visit(node.right, context)}`;
}

LatexCompiler.prototype.subtraction = function (node: SubtractionASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.left, context)}-${this.visit(node.right, context)}`;
}

LatexCompiler.prototype.forClause = function (node: ForClauseASTNode, context: LatexCompilerVisitContext): string {
    let result = `${this.visit(node.content, context)}${l.opName('for')}`;
    result += node.ctxVarDefs.map(def => {
        const realname = this.compileContext.internalCtxVarRealnameMap.get(def);
        return `${realname}=${this.visit(def.expr, context)}`;
    }).join(',');
    return result;
}

LatexCompiler.prototype.withClause = function (node: WithClauseASTNode, context: LatexCompilerVisitContext): string {
    const childContext = { ...context, ctxPath: [...context.ctxScopeStack, node.ctxVarDefs] };
    let result = `${this.visit(node.content, childContext)}${l.opName('with')}`;
    result += node.ctxVarDefs.map(def => {
        const realname = this.compileContext.internalCtxVarRealnameMap.get(def);
        // notice that we dont add a new ctx scope  when visiting ctx clause's definition part
        return `${realname}=${this.visit(def.expr, context)}`;
    }).join(',');
    return result;
}

LatexCompiler.prototype.multiplication = function (node: MultiplicationASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.left, context)}${l['*']}${this.visit(node.right, context)}`;
}

LatexCompiler.prototype.division = function (node: DivisionASTNode, context: LatexCompilerVisitContext): string {
    return l['/'](this.visit(node.left, context), this.visit(node.right, context));
}

LatexCompiler.prototype.cross = function (node: CrossASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.left, context)}${l['cross']}${this.visit(node.right, context)}`;
}

LatexCompiler.prototype.percentOf = function (node: PercentOfASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.left, context)}${l['%of']}${this.visit(node.right, context)}`;
}

LatexCompiler.prototype.omittedCall = function (node: OmittedCallASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.func, context)}${this.visit(node.arg, context)}`;
}

LatexCompiler.prototype.implicitMult = function (node: ImplicitMultASTNode, context: LatexCompilerVisitContext): string {
    return node.operands.map(operand => this.visit(operand, context)).join('');
}

LatexCompiler.prototype.unaryMinus = function (node: UnaryMinusASTNode, context: LatexCompilerVisitContext): string {
    return `-${this.visit(node.operand, context)}`;
}

LatexCompiler.prototype.unaryPlus = function (node: UnaryPlusASTNode, context: LatexCompilerVisitContext): string {
    return `+${this.visit(node.operand, context)}`;
}

LatexCompiler.prototype.power = function (node: PowerASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.base, context)}^{${this.visit(node.exponent, context)}}`;
}

LatexCompiler.prototype.factorial = function (node: FactorialASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.operand, context)}!`;
}

LatexCompiler.prototype.attrAccess = function (node: AttrAccessASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.operand, context)}.${node.attr}`;
}

LatexCompiler.prototype.extensionFuncCall = function (node: ExtensionFuncCallASTNode, context: LatexCompilerVisitContext): string {
    return (
        `${this.visit(node.receiver, context)}.${this.visit(node.func, context)}`
        + (node.withArgsList
            ? `\\left(${node.args.map((a: any) => this.visit(a, context)).join(',')}\\right)`
            : '')
    );
}

LatexCompiler.prototype.listFiltering = function (node: ListFilteringASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.operand, context)}\\left[${this.visit(node.filter, context)}\\right]`;
}

LatexCompiler.prototype.listIndexing = function (node: ListIndexingASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.operand, context)}\\left[${this.visit(node.index, context)}\\right]`;
}

LatexCompiler.prototype.listSlicing = function (node: ListSlicingASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.operand, context)}\\left[${
        node.indices.map((i: any) => this.visit(i, context)).join(',')
    }\\right]`;
}

LatexCompiler.prototype.listSliceRange = function (node: ListSliceRangeASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.start, context)}...${node.end ? this.visit(node.end, context) : ''}`;
}

LatexCompiler.prototype.comparison = function (node: ComparisonASTNode, context: LatexCompilerVisitContext): string {
    let result = '';
    for (let i = 0; i < node.operands.length; i++) {
        result += this.visit(node.operands[i], context);
        if (i < node.operators.length) result += l[node.operators[i]];
    }
    return result;
}

LatexCompiler.prototype.sum = function (node: SumClauseASTNode, context: LatexCompilerVisitContext): string {
    const realname = this.compileContext.internalCtxVarRealnameMap.get(node.ctxVarDef);
    const lower = this.visit(node.ctxVarDef.lower, context);
    const upper = this.visit(node.ctxVarDef.upper, context);
    const childContext = { ...context, ctxScopeStack: [...context.ctxScopeStack, [node.ctxVarDef]] };
    const content = this.visit(node.content, childContext);
    return `\\sum_{${realname}=${lower}}^{${upper}}${content}`;
}

LatexCompiler.prototype.prod = function (node: ProdClauseASTNode, context: LatexCompilerVisitContext): string {
    const realname = this.compileContext.internalCtxVarRealnameMap.get(node.ctxVarDef);
    const lower = this.visit(node.ctxVarDef.lower, context);
    const upper = this.visit(node.ctxVarDef.upper, context);
    const childContext = { ...context, ctxScopeStack: [...context.ctxScopeStack, [node.ctxVarDef]] };
    const content = this.visit(node.content, childContext);
    return `\\prod_{${realname}=${lower}}^{${upper}}${content}`;
}

LatexCompiler.prototype.int = function (node: IntClauseASTNode, context: LatexCompilerVisitContext): string {
    const realname = this.compileContext.internalCtxVarRealnameMap.get(node.ctxVarDef);
    const lower = this.visit(node.ctxVarDef.lower, context);
    const upper = this.visit(node.ctxVarDef.upper, context);
    const childContext = { ...context, ctxScopeStack: [...context.ctxScopeStack, [node.ctxVarDef]] };
    const content = this.visit(node.content, childContext);
    return `\\int_{${lower}}^{${upper}}${content}d${realname}`;
}

LatexCompiler.prototype.diff = function (node: DiffClauseASTNode, context: LatexCompilerVisitContext): string {
    const realname = this.compileContext.internalCtxVarRealnameMap.get(node.ctxVarDef);
    const childContext = { ...context, ctxScopeStack: [...context.ctxScopeStack, [node.ctxVarDef]] };
    const content = this.visit(node.content, childContext);
    return `\\frac{d}{d${realname}}${content}`;
}