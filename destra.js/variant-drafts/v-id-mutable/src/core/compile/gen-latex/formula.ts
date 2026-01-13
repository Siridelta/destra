import { LatexCompiler } from ".";
import { CompileResult } from "..";
import { CtxVarNullDefASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/addSub-level";
import { ActionASTNode, CommasASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/commas-level";
import { FormulaASTNode, SliderConfigASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/formula";
import { ExplicitEquationASTNode, ExpressionASTNode, FunctionDefinitionASTNode, ImplicitEquationASTNode, RegressionASTNode, VariableDefinitionASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/top-level";
import { Expl, FuncExpl } from "../../formula/base";
import { l } from "./latex";

declare module '.' {
    interface LatexCompiler {
        formula(node: FormulaASTNode): CompileResult;
        
        sliderConfig(node: SliderConfigASTNode): { max?: string, min?: string, step?: string };

        variableDefinition(node: VariableDefinitionASTNode): string;
        functionDefinition(node: FunctionDefinitionASTNode): string;
        expression(node: ExpressionASTNode): string;
        explicitEquation(node: ExplicitEquationASTNode): string;
        implicitEquation(node: ImplicitEquationASTNode): string;
        regression(node: RegressionASTNode): string;
        _varDef(content: any): string;
        _funcDef(content: any, astParams: CtxVarNullDefASTNode[]): string;

        commas(node: CommasASTNode): string;
        action(node: ActionASTNode): string;
    }
}

LatexCompiler.prototype.formula = function (node: FormulaASTNode): CompileResult {
    return {
        latex: this.visit(node.content),
        slider: node.slider ? this.sliderConfig(node.slider) : null,
    }
}

LatexCompiler.prototype.sliderConfig = function (node: SliderConfigASTNode): { max?: string, min?: string, step?: string } {
    const r: { max?: string, min?: string, step?: string } = {};
    if (node.max) r.max = this.visit(node.max);
    if (node.min) r.min = this.visit(node.min);
    if (node.step) r.step = this.visit(node.step);
    return r;
}

LatexCompiler.prototype.variableDefinition = function (node: VariableDefinitionASTNode): string {
    return this._varDef(node.content);
}

LatexCompiler.prototype.functionDefinition = function (node: FunctionDefinitionASTNode): string {
    return this._funcDef(node.content, node.params);
}

LatexCompiler.prototype.expression = function (node: ExpressionASTNode): string {
    if (this.targetFormula instanceof Expl) {
        return this._varDef(node.content);
    } else {
        return this.visit(node.content);
    }
}

LatexCompiler.prototype._varDef = function (content: any): string {
    const name = this.getRealname();
    if (!name) throw new Error("Internal error: Failed to get realname for variable definition");
    return `${name}=${this.visit(content)}`;
}

LatexCompiler.prototype._funcDef = function (content: any, astParams: CtxVarNullDefASTNode[]): string {
    const name = this.getRealname();
    if (!name) throw new Error("Internal error: Failed to get realname for function definition");
    const _params = this.compileContext.funcExplCtxVarRealnameMap.get(this.targetFormula as FuncExpl<any>) ?? new Map<number, string>();
    const params: string[] = [];
    for (let i = 0; i < _params.size; i++) {
        params.push(_params.get(i) ?? "");
    }
    if (params.length !== astParams.length) throw new Error("Internal error: Failed to get realnames for function parameters");
    return `${name}\\left(${params.join(",")}\\right)=${this.visit(content)}`;
}

LatexCompiler.prototype.explicitEquation = function (node: ExplicitEquationASTNode): string {
    const op = node.op as keyof typeof l;
    return `${this.visit(node.lhs)}${l[op]}${this.visit(node.rhs)}`;
}

LatexCompiler.prototype.implicitEquation = function (node: ImplicitEquationASTNode): string {
    let result = '';
    for (let i = 0; i < node.operands.length; i++) {
        result += this.visit(node.operands[i]);
        if (i < node.ops.length) result += l[node.ops[i] as keyof typeof l];
    }
    return result;
}

LatexCompiler.prototype.regression = function (node: RegressionASTNode): string {
    return `${this.visit(node.lhs)}${l[node.op as keyof typeof l]}${this.visit(node.rhs)}`;
}

LatexCompiler.prototype.commas = function (node: CommasASTNode): string {
    return node.items.map(item => this.visit(item)).join(",");
}

LatexCompiler.prototype.action = function (node: ActionASTNode): string {
    return `${this.visit(node.target)}${l['->']}${this.visit(node.value)}`;
}