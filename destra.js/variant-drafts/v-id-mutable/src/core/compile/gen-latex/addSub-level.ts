import { LatexCompiler } from ".";
import { ComparisonASTNode } from "../../expr-dsl/parse-ast/sematics/helpers";
import { AdditionASTNode, ForClauseASTNode, SubtractionASTNode, WithClauseASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/addSub-level";
import { DiffClauseASTNode, IntClauseASTNode, ProdClauseASTNode, SumClauseASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/context-type1";
import { CrossASTNode, DivisionASTNode, ImplicitMultASTNode, MultiplicationASTNode, OmittedCallASTNode, PercentOfASTNode, PowerASTNode, UnaryMinusASTNode, UnaryPlusASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { AttrAccessASTNode, ExtensionFuncCallASTNode, FactorialASTNode, ListFilteringASTNode, ListIndexingASTNode, ListSliceRangeASTNode, ListSlicingASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/postfix-level";
import { l } from "./latex";

declare module '.' {
    interface LatexCompiler {
        addition(node: AdditionASTNode): string;
        subtraction(node: SubtractionASTNode): string;

        forClause(node: ForClauseASTNode): string;
        withClause(node: WithClauseASTNode): string;

        multiplication(node: MultiplicationASTNode): string;
        division(node: DivisionASTNode): string;
        cross(node: CrossASTNode): string;
        percentOf(node: PercentOfASTNode): string;
        omittedCall(node: OmittedCallASTNode): string;
        implicitMult(node: ImplicitMultASTNode): string;

        unaryMinus(node: UnaryMinusASTNode): string;
        unaryPlus(node: UnaryPlusASTNode): string;
        power(node: PowerASTNode): string;

        factorial(node: FactorialASTNode): string;
        attrAccess(node: AttrAccessASTNode): string;
        extensionFuncCall(node: ExtensionFuncCallASTNode): string;
        listFiltering(node: ListFilteringASTNode): string;
        listIndexing(node: ListIndexingASTNode): string;
        listSlicing(node: ListSlicingASTNode): string;
        listSliceRange(node: ListSliceRangeASTNode): string;

        comparison(node: ComparisonASTNode): string;

        sum(node: SumClauseASTNode): string;
        prod(node: ProdClauseASTNode): string;
        int(node: IntClauseASTNode): string;
        diff(node: DiffClauseASTNode): string;
    }
}

LatexCompiler.prototype.addition = function (node: AdditionASTNode): string {
    return `${this.visit(node.left)}+${this.visit(node.right)}`;
}

LatexCompiler.prototype.subtraction = function (node: SubtractionASTNode): string {
    return `${this.visit(node.left)}-${this.visit(node.right)}`;
}

LatexCompiler.prototype.forClause = function (node: ForClauseASTNode): string {
    let result = `${this.visit(node.content)}${l.opName('for')}`;
    result += node.ctxVarDefs.map(def => {
        const realname = this.compileContext.internalCtxVarRealnameMap.get(def);
        return `${realname}=${this.visit(def.expr)}`;
    }).join(',');
    return result;
}

LatexCompiler.prototype.withClause = function (node: WithClauseASTNode): string {
    let result = `${this.visit(node.content)}${l.opName('with')}`;
    result += node.ctxVarDefs.map(def => {
        const realname = this.compileContext.internalCtxVarRealnameMap.get(def);
        return `${realname}=${this.visit(def.expr)}`;
    }).join(',');
    return result;
}

LatexCompiler.prototype.multiplication = function (node: MultiplicationASTNode): string {
    return `${this.visit(node.left)}${l['*']}${this.visit(node.right)}`;
}

LatexCompiler.prototype.division = function (node: DivisionASTNode): string {
    return l['/'](this.visit(node.left), this.visit(node.right));
}

LatexCompiler.prototype.cross = function (node: CrossASTNode): string {
    return `${this.visit(node.left)}${l['cross']}${this.visit(node.right)}`;
}

LatexCompiler.prototype.percentOf = function (node: PercentOfASTNode): string {
    return `${this.visit(node.left)}${l['%of']}${this.visit(node.right)}`;
}

LatexCompiler.prototype.omittedCall = function (node: OmittedCallASTNode): string {
    return `${this.visit(node.func)}${this.visit(node.arg)}`;
}

LatexCompiler.prototype.implicitMult = function (node: ImplicitMultASTNode): string {
    return node.operands.map(operand => this.visit(operand)).join('');
}

LatexCompiler.prototype.unaryMinus = function (node: UnaryMinusASTNode): string {
    return `-${this.visit(node.operand)}`;
}

LatexCompiler.prototype.unaryPlus = function (node: UnaryPlusASTNode): string {
    return `+${this.visit(node.operand)}`;
}

LatexCompiler.prototype.power = function (node: PowerASTNode): string {
    return `${this.visit(node.base)}^{${this.visit(node.exponent)}}`;
}

LatexCompiler.prototype.factorial = function (node: FactorialASTNode): string {
    return `${this.visit(node.operand)}!`;
}

LatexCompiler.prototype.attrAccess = function (node: AttrAccessASTNode): string {
    return `${this.visit(node.operand)}.${node.attr}`;
}

LatexCompiler.prototype.extensionFuncCall = function (node: ExtensionFuncCallASTNode): string {
    return (
        `${this.visit(node.receiver)}.${this.visit(node.func)}`
        + (node.withArgsList
            ? `\\left(${node.args.map((a: any) => this.visit(a)).join(',')}\\right)`
            : '')
    );
}

LatexCompiler.prototype.listFiltering = function (node: ListFilteringASTNode): string {
    return `${this.visit(node.operand)}\\left[${this.visit(node.filter)}\\right]`;
}

LatexCompiler.prototype.listIndexing = function (node: ListIndexingASTNode): string {
    return `${this.visit(node.operand)}\\left[${this.visit(node.index)}\\right]`;
}

LatexCompiler.prototype.listSlicing = function (node: ListSlicingASTNode): string {
    return `${this.visit(node.operand)}\\left[${
        node.indices.map((i: any) => this.visit(i)).join(',')
    }\\right]`;
}

LatexCompiler.prototype.listSliceRange = function (node: ListSliceRangeASTNode): string {
    return `${this.visit(node.start)}...${node.end ? this.visit(node.end) : ''}`;
}

LatexCompiler.prototype.comparison = function (node: ComparisonASTNode): string {
    let result = '';
    for (let i = 0; i < node.operands.length; i++) {
        result += this.visit(node.operands[i]);
        if (i < node.operators.length) result += l[node.operators[i]];
    }
    return result;
}

LatexCompiler.prototype.sum = function (node: SumClauseASTNode): string {
    const realname = this.compileContext.internalCtxVarRealnameMap.get(node.ctxVarDef);
    const lower = this.visit(node.ctxVarDef.lower);
    const upper = this.visit(node.ctxVarDef.upper);
    const content = this.visit(node.content);
    return `\\sum_{${realname}=${lower}}^{${upper}}${content}`;
}

LatexCompiler.prototype.prod = function (node: ProdClauseASTNode): string {
    const realname = this.compileContext.internalCtxVarRealnameMap.get(node.ctxVarDef);
    const lower = this.visit(node.ctxVarDef.lower);
    const upper = this.visit(node.ctxVarDef.upper);
    const content = this.visit(node.content);
    return `\\prod_{${realname}=${lower}}^{${upper}}${content}`;
}

LatexCompiler.prototype.int = function (node: IntClauseASTNode): string {
    const realname = this.compileContext.internalCtxVarRealnameMap.get(node.ctxVarDef);
    const lower = this.visit(node.ctxVarDef.lower);
    const upper = this.visit(node.ctxVarDef.upper);
    const content = this.visit(node.content);
    return `\\int_{${lower}}^{${upper}}${content}d${realname}`;
}

LatexCompiler.prototype.diff = function (node: DiffClauseASTNode): string {
    const realname = this.compileContext.internalCtxVarRealnameMap.get(node.ctxVarDef);
    const content = this.visit(node.content);
    return `\\frac{d}{d${realname}}${content}`;
}