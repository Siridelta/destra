import { lexer } from "./lexing/lexer";
import { FormulaParser, formulaParser } from "./parsing/parser";
import { FormulaVisitor } from "./sematics/visitor";
import type { FormulaASTNode } from "./sematics/visitor-parts/formula";
import type { CtxFactoryExprDefHeadASTNode, CtxFactoryHeadASTNode, CtxFactoryNullDefHeadASTNode, CtxFactoryRangeDefHeadASTNode } from "./sematics/visitor-parts/ctx-header";
import { TemplatePayload } from "../../formula/base";
import { CstNode, IToken } from "chevrotain";
import { preprocess } from "./preprocess";

export { FormulaASTNode, CtxFactoryHeadASTNode, CtxFactoryExprDefHeadASTNode, CtxFactoryNullDefHeadASTNode, CtxFactoryRangeDefHeadASTNode };
export * from "./sematics/helpers";

/**
 * 构建可检查的源代码字符串
 * 将模板载荷转换为一个字符串，其中插值部分用 `$index$` 占位符替换
 */
export const buildSource = (payload: TemplatePayload): string => {
    const { strings, values } = payload;
    let source = strings[0]!;
    for (let index = 0; index < values.length; index += 1) {
        source += `\$${index}\$`;
        source += strings[index + 1]!;
    }
    return source;
};


function lex(template: TemplatePayload) {
    const source = preprocess(buildSource(template));

    const lexResult = lexer.tokenize(source);
    if (lexResult.errors.length > 0) {
        throw new Error(`Lexing errors: ${lexResult.errors.map(e => e.message).join(", ")}`);
    }

    return { tokens: lexResult.tokens, values: template.values };
}

function runParser(tokens: IToken[], ruleName: keyof FormulaParser): CstNode {
    formulaParser.input = tokens;
    const cst = formulaParser[ruleName]();
    
    if (formulaParser.errors.length > 0) {
        throw new Error(
            `Parsing errors in rule '${ruleName}': ${formulaParser.errors.map(e => e.message).join(", ")} \n`
            + `Stack trace: ${formulaParser.errors.map(e => e.stack).join("\n")}`
        );
    }
    return cst;
}

export const parseFormula = (template: TemplatePayload): FormulaASTNode => {
    const { tokens, values } = lex(template);
    const cst = runParser(tokens, 'formula');
    
    const visitor = new FormulaVisitor(values);
    return visitor.visit(cst);
};

export const parseCtxFactoryExprDefHead = (template: TemplatePayload): CtxFactoryExprDefHeadASTNode => {
    const { tokens, values } = lex(template);
    const cst = runParser(tokens, 'ctxFactoryExprDefHead');
    
    const visitor = new FormulaVisitor(values);
    return visitor.visit(cst);
};

export const parseCtxFactoryRangeDefHead = (template: TemplatePayload): CtxFactoryRangeDefHeadASTNode => {
    const { tokens, values } = lex(template);
    const cst = runParser(tokens, 'ctxFactoryRangeDefHead');
    
    const visitor = new FormulaVisitor(values);
    return visitor.visit(cst);
};

export const parseCtxFactoryNullDefHead = (template: TemplatePayload): CtxFactoryNullDefHeadASTNode => {
    const { tokens, values } = lex(template);
    const cst = runParser(tokens, 'ctxFactoryNullDefHead');
    
    const visitor = new FormulaVisitor(values);
    return visitor.visit(cst);
};
