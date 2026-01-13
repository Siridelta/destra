import { LatexCompiler, LatexCompilerVisitContext } from ".";
import { CompileResult } from "..";
import { CtxVarNullDefASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/addSub-level";
import { ActionASTNode, CommasASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/commas-level";
import { FormulaASTNode, SliderConfigASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/formula";
import { ExplicitEquationASTNode, ExpressionASTNode, FunctionDefinitionASTNode, ImplicitEquationASTNode, RegressionASTNode, VariableDefinitionASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/top-level";
import { Expl, FuncExpl } from "../../formula/base";
import { l } from "./latex";

declare module '.' {
    interface LatexCompiler {
        formula(node: FormulaASTNode, context: LatexCompilerVisitContext): CompileResult;
        
        sliderConfig(node: SliderConfigASTNode, context: LatexCompilerVisitContext): { max?: string, min?: string, step?: string };

        variableDefinition(node: VariableDefinitionASTNode, context: LatexCompilerVisitContext): string;
        functionDefinition(node: FunctionDefinitionASTNode, context: LatexCompilerVisitContext): string;
        expression(node: ExpressionASTNode, context: LatexCompilerVisitContext): string;
        explicitEquation(node: ExplicitEquationASTNode, context: LatexCompilerVisitContext): string;
        implicitEquation(node: ImplicitEquationASTNode, context: LatexCompilerVisitContext): string;
        regression(node: RegressionASTNode, context: LatexCompilerVisitContext): string;
        _varDef(content: any, context: LatexCompilerVisitContext): string;
        _funcDef(content: any, astParams: CtxVarNullDefASTNode[], context: LatexCompilerVisitContext): string;

        commas(node: CommasASTNode, context: LatexCompilerVisitContext): string;
        action(node: ActionASTNode, context: LatexCompilerVisitContext): string;
    }
}

LatexCompiler.prototype.formula = function (node: FormulaASTNode, context: LatexCompilerVisitContext): CompileResult {
    return {
        latex: this.visit(node.content, context),
        slider: node.slider ? this.sliderConfig(node.slider, context) : null,
    }
}

LatexCompiler.prototype.sliderConfig = function (node: SliderConfigASTNode, context: LatexCompilerVisitContext): { max?: string, min?: string, step?: string } {
    const r: { max?: string, min?: string, step?: string } = {};
    if (node.max) r.max = this.visit(node.max, context);
    if (node.min) r.min = this.visit(node.min, context);
    if (node.step) r.step = this.visit(node.step, context);
    return r;
}

LatexCompiler.prototype.variableDefinition = function (node: VariableDefinitionASTNode, context: LatexCompilerVisitContext): string {
    return this._varDef(node.content, context);
}

LatexCompiler.prototype.functionDefinition = function (node: FunctionDefinitionASTNode, context: LatexCompilerVisitContext): string {
    return this._funcDef(node.content, node.params, context);
}

LatexCompiler.prototype.expression = function (node: ExpressionASTNode, context: LatexCompilerVisitContext): string {
    if (this.targetFormula instanceof Expl) {
        return this._varDef(node.content, context);
    } else {
        return this.visit(node.content, context);
    }
}

LatexCompiler.prototype._varDef = function (content: any, context: LatexCompilerVisitContext): string {
    const name = this.getRealname();
    if (!name) throw new Error("Internal error: Failed to get realname for variable definition");
    return `${name}=${this.visit(content, context)}`;
}

LatexCompiler.prototype._funcDef = function (content: any, astParams: CtxVarNullDefASTNode[], context: LatexCompilerVisitContext): string {
    const name = this.getRealname();
    if (!name) throw new Error("Internal error: Failed to get realname for function definition");
    const paramsMap = this.compileContext.funcExplCtxVarRealnameMap.get(this.targetFormula as FuncExpl<any>) ?? new Map<number, string>();
    const params: string[] = [];
    for (let i = 0; i < paramsMap.size; i++) {
        params.push(paramsMap.get(i) ?? "");
    }
    if (params.length !== astParams.length) throw new Error("Internal error: Failed to get realnames for function parameters");
    
    const childContext = { ...context, ctxScopeStack: [...context.ctxScopeStack, astParams] };
    return `${name}\\left(${params.join(",")}\\right)=${this.visit(content, childContext)}`;
}

LatexCompiler.prototype.explicitEquation = function (node: ExplicitEquationASTNode, context: LatexCompilerVisitContext): string {
    const op = node.op as keyof typeof l;
    return `${this.visit(node.lhs, context)}${l[op]}${this.visit(node.rhs, context)}`;
}

LatexCompiler.prototype.implicitEquation = function (node: ImplicitEquationASTNode, context: LatexCompilerVisitContext): string {
    let result = '';
    for (let i = 0; i < node.operands.length; i++) {
        result += this.visit(node.operands[i], context);
        if (i < node.ops.length) result += l[node.ops[i] as keyof typeof l];
    }
    return result;
}

LatexCompiler.prototype.regression = function (node: RegressionASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.lhs, context)}${l[node.op as keyof typeof l]}${this.visit(node.rhs, context)}`;
}

LatexCompiler.prototype.commas = function (node: CommasASTNode, context: LatexCompilerVisitContext): string {
    return node.items.map(item => this.visit(item, context)).join(",");
}

LatexCompiler.prototype.action = function (node: ActionASTNode, context: LatexCompilerVisitContext): string {
    return `${this.visit(node.target, context)}${l['->']}${this.visit(node.value, context)}`;
}