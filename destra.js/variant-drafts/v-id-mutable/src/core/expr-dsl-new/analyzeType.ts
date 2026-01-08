import { FormulaType } from "../formula/base";
import { FormulaASTNode } from "./parse-formula";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 公式类型信息联合类型
 */
export type FormulaTypeInfo =
    | {
        readonly type: FormulaType.Expression;
    }
    | {
        readonly type: FormulaType.ExplicitEquation;
        readonly lhsName: string | null;    // null for omitted explicit equation
    }
    | {
        readonly type: FormulaType.ImplicitEquation;
        readonly subtype: 'equation' | 'inequality';
    }
    | {
        readonly type: FormulaType.Regression;
    }
    | {
        readonly type: FormulaType.Variable;
        readonly name?: string;
    }
    | {
        readonly type: FormulaType.Function;
        readonly name?: string;
        readonly params: readonly string[];
    };

type FormulaTypeInfoOfExpr = Extract<
    FormulaTypeInfo,
    {
        readonly type:
        | FormulaType.Expression
        | FormulaType.ExplicitEquation
        | FormulaType.ImplicitEquation
        | FormulaType.Regression;
    }
>;

type FormulaTypeInfoOfExpl = Extract<
    FormulaTypeInfo,
    {
        readonly type: FormulaType.Variable | FormulaType.Function;
    }
>;


/**
 * 分析公式的类型并检查
 *
 * @param ast 公式 AST
 * @param factoryType 工厂类型（"expr" 或 "expl"）
 * @returns 公式类型信息
 */
function analyzeTypeAndCheck(ast: FormulaASTNode, factoryType: "expr"): FormulaTypeInfoOfExpr;
function analyzeTypeAndCheck(ast: FormulaASTNode, factoryType: "expl"): FormulaTypeInfoOfExpl;
function analyzeTypeAndCheck(
    ast: FormulaASTNode,
    factoryType: "expr" | "expl",
): FormulaTypeInfo {
    let info: FormulaTypeInfo | null = null;
    
    switch (ast.content.type) {
        case "expression":
            if (factoryType === "expr") {
                info = { type: FormulaType.Expression };
            } else {
                info = { type: FormulaType.Variable };
            }
            break;
        
        case "variableDefinition":
            if (factoryType === "expr") {
                throw new Error(
                    `Invalid syntax: Variable definition must be created with expl, got ${factoryType}.`
                );
            }
            info = { type: FormulaType.Variable, name: ast.content.name };
            break;
        
        case "explicitEquation":
            if (factoryType === "expl") {
                throw new Error(
                    `Invalid syntax: Explicit equation must be created with expr, got ${factoryType}.`
                );
            }
            info = { type: FormulaType.ExplicitEquation, lhsName: ast.content.lhs };
            break;
        
        case "implicitEquation":
            if (factoryType === "expl") {
                throw new Error(
                    `Invalid syntax: Implicit equation must be created with expr, got ${factoryType}.`
                );
            }
            info = { type: FormulaType.ImplicitEquation, subtype: ast.content.ops[0] === '=' ? 'equation' : 'inequality' };
            break;
        case "regression":
            if (factoryType === "expl") {
                throw new Error(
                    `Invalid syntax: Regression must be created with expr, got ${factoryType}.`
                );
            }
            info = { type: FormulaType.Regression };
            break;
        case "functionDefinition":
            if (factoryType === "expr") {
                throw new Error(
                    `Invalid syntax: Function definition must be created with expl, got ${factoryType}.`
                );
            }
            info = { type: FormulaType.Function, name: ast.content.name ?? undefined, params: ast.content.params.map(p => p.name) };
            break;
    }

    info = info!;
    
    if (ast.slider) {
        if (info.type !== FormulaType.Variable){
            throw new Error(
                `Invalid syntax: Slider must be applied to a variable definition, got [${info.type}].`
            );
        }
    }

    return info;
}

export { 
    analyzeTypeAndCheck,
};

