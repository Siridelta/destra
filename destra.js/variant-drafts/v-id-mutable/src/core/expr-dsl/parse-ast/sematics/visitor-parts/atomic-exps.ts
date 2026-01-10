import { IToken } from "chevrotain";
import { FormulaVisitor } from "../base-visitor";
import { BuiltinFuncASTNode, SubstitutionASTNode, VarIRNode } from "./terminals";
import { SupportOmittedCallFunc } from "../../tokens/reserved-words/builtin-funcs/categories";
import { RangeDots } from "../../tokens/op-and-puncs";
import { CommasASTNode } from "./commas-level";
import { traceSubstitution } from "../helpers";
import { Formula, isFuncExpl } from "../../../../formula/base";


declare module '../base-visitor' {
    interface FormulaVisitor {
        atomicExp(ctx: any): any;
        builtinFuncCall(ctx: any): any;
        argsList(ctx: any): any;
        varOrCall(ctx: any): any;
        parenExp(ctx: any): any;
        listExp(ctx: any): any;
        listItem(ctx: any): any;
        toListRangeASTNode(items: any[]): ListRangeASTNode;
        absExp(ctx: any): any;
    }
}

export type BuiltinFuncCallASTNode = {
    type: "builtinFuncCall",
    func: BuiltinFuncASTNode,
    args: any[],
}

export type DefinedFuncCallASTNode = {
    type: "definedFuncCall",
    func: SubstitutionASTNode,
    args: any[],
}

export type MaybeOCallFuncIRNode = {
    type: "maybeOCallFuncIR",
    func: BuiltinFuncASTNode
}

export type MaybeFuncDefIRNode = {
    type: "maybeFuncDefIR",
    func: VarIRNode,
    params: any[],
}

export type ParenExpASTNode = {
    type: "parenExp",
    content: any,
}

export type TupleExpASTNode = {
    type: "tupleExp",
    items: any[],
}

export type ListExpASTNode = {
    type: "listExp",
    items: any[],
}

export type ListRangeASTNode = {
    type: "listRange",
    start: any,
    end: any,
}

export type AbsExpASTNode = {
    type: "absExp",
    content: any,
}

FormulaVisitor.prototype.atomicExp = function (ctx: any) {
    if (ctx.NumberLiteral) {
        return this.toNumberAST(ctx.NumberLiteral[0].image);
    }
    if (ctx.ColorHexLiteral) {
        return this.toColorHexLiteralAST(ctx.ColorHexLiteral[0].image);
    }
    if (ctx.Constant) {
        return this.toConstantAST(ctx.Constant[0].image);
    }
    if (ctx.case) {
        return this.visit(ctx.case);
    }
    throw new Error(`Internal error: Unexpected token ${JSON.stringify(ctx)} in atomicExp`);
}

FormulaVisitor.prototype.builtinFuncCall = function (ctx: any) {
    const funcToken = ctx.BuiltinFunc[0] as IToken;
    const args = ctx.argsList ? this.visit(ctx.argsList) : null;
    
    if (args === null) {
        // consider an omitted call function IR node, 
        // sent to IMultAndOCall level for further processing
        if (funcToken.tokenType.CATEGORIES
            && funcToken.tokenType.CATEGORIES.includes(SupportOmittedCallFunc)) {
            return {
                type: "maybeOCallFuncIR",
                func: this.toBuiltinFuncAST(funcToken.image),
            }
        }
        throw new Error(
            `Detected function identifier '${funcToken.image}' with no explicit argument list. `
            + `Please use parenthesis to call function '${funcToken.image}'. `
        );
    }
    return {
        type: "builtinFuncCall",
        func: this.toBuiltinFuncAST(funcToken.image),
        args: args,
    }
}

FormulaVisitor.prototype.argsList = function (ctx: any) {
    return ctx.arg ? this.batchVisit(ctx.arg) : [];
}

FormulaVisitor.prototype.varOrCall = function (ctx: any)
    : VarIRNode | SubstitutionASTNode | DefinedFuncCallASTNode | MaybeFuncDefIRNode {
    const placeholder = ctx.Placeholder ? ctx.Placeholder[0] : null;
    const customVar = ctx.CustomIdentifier ? ctx.CustomIdentifier[0] : null;
    const reservedVar = ctx.ReservedVar ? ctx.ReservedVar[0] : null;
    const args = ctx.argsList ? this.visit(ctx.argsList) : null;

    if (reservedVar) {
        return this.toVarIR(reservedVar.image);
    }
    if (placeholder) {
        if (args) {
            // check if it is FuncExpl
            const substAST = this.toSubstitutionAST(placeholder.image);
            const funcExpl = traceSubstitution(substAST, this);
            if (!(funcExpl instanceof Formula) || !isFuncExpl(funcExpl)) {
                throw new Error(
                    `Ambiguous syntax: Do not place a value / variable with a left parenthesis.`
                    + `Consider using '*' to express multiplication.`
                );
            }
            return {
                type: "definedFuncCall",
                func: substAST,
                args: args,
            }
        } else {
            return this.toSubstitutionAST(placeholder.image);
        }
    }
    if (customVar) {
        if (args) {
            // function definition side is 'params'; call side is 'args'
            return {
                type: "maybeFuncDefIR",
                func: this.toVarIR(customVar.image),
                params: args,
            }
        } else {
            return this.toVarIR(customVar.image);
        }
    }
    throw new Error(`Internal error: Unexpected token ${JSON.stringify(ctx)} in varOrCall`);
}

FormulaVisitor.prototype.parenExp = function (ctx: any) {
    const content = this.visit(ctx.commasLevel);

    // commas node -> TupleExp
    if (content.type === 'commas') {
        return {
            type: "tupleExp",
            items: content.items,
        }
    }
    // other types -> ParenExp
    return {
        type: "parenExp",
        content: content,
    }
}

FormulaVisitor.prototype.toListRangeASTNode = function (items: any[]): ListRangeASTNode {
    if (items.length !== 3) {
        throw new Error("Internal error: Invalid item syntax for listRange: length must be 3");
    }
    if (!(items[1]?.tokenType === RangeDots)) {
        throw new Error("Internal error: Invalid item syntax for listRange: second item must be RangeDots");
    }
    return {
        type: "listRange",
        start: items[0],
        end: items[2],
    }
}

FormulaVisitor.prototype.listExp = function (ctx: any) {
    const items = ctx.listItem ? this.batchVisit(ctx.listItem) : [];
    let hasRange = false;

    // scan and merge comma seperated expr-rangedots-expr patterns
    for (let i = 0; i < items.length; i++) {
        const item1 = i - 1 >= 0 ? items[i - 1] : null;
        const item2 = items[i];
        const item3 = i + 1 < items.length ? items[i + 1] : null;
        if (item2?.tokenType === RangeDots) {
            if (hasRange)
                throw new Error(
                    `Invalid list syntax: found duplicate '...' tokens. `
                );
            if (!item1)
                throw new Error(
                    `Cannot be blank before '...' token. `
                );
            if (!item3)
                throw new Error(
                    `Cannot be blank after '...' token. `
                );
            if (item3?.tokenType === RangeDots)
                throw new Error(
                    `Invalid list syntax: found consecutive '...' tokens. `
                );
            items.splice(i - 1, 3, this.toListRangeASTNode([item1, item2, item3]));
            i--;
            hasRange = true;
        }
    }
    return {
        type: "listExp",
        items: items,
    }
}

FormulaVisitor.prototype.listItem = function (ctx: any) {
    const terms = this.batchVisit(ctx.term);
    if (terms.length === 0) {
        throw new Error(`Internal error: Invalid item syntax for listItem: unexpected term count ${terms.length}`);
    }
    if (terms.length === 1) {
        return terms[0];
    }
    if (terms.length !== 3) {
        throw new Error(`Internal error: Invalid item syntax for listItem: unexpected term count ${terms.length}`);
    }
    return this.toListRangeASTNode(terms);
}

FormulaVisitor.prototype.absExp = function (ctx: any): AbsExpASTNode {
    const content = this.visit(ctx.addSubLevel);
    return {
        type: "absExp",
        content: content,
    }
}