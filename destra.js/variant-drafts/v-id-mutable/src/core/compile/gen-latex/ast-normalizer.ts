import { ComparisonASTNode, ComparisonOperator } from "../../expr-dsl/parse-ast/sematics/helpers";
import { BuiltinFuncCallASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { DivisionASTNode, ModASTNode, MultiplicationASTNode, PowerASTNode, RootofASTNode, UnaryMinusASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { BuiltinFuncASTNode, NumberASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/terminals";
import { ASTVisitor } from "../../expr-dsl/visit-ast/ast-visitor";
import { RootASTNode } from "../types";

export class ASTNormalizer extends ASTVisitor<any, void> {

    // 增加 default 支持，为所有不匹配的分支重定向到 default 分支
    public visit(node: any, context: void): any {
        const type = node.type;
        if (type && type in this) {
            return this.visit(node, context);
        } else {
            return this.default(node, context);
        }
    }

    // 为恒等函数
    public default<T>(node: T, context: void): T {
        return node;
    }
}

export interface ASTNormalizer {
    
}

