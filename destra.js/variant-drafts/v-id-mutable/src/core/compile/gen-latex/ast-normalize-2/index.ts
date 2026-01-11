import { getASTChildPaths, getChildByPath, setChildByPath } from "../../../expr-dsl/parse-ast/sematics/traverse-ast";
import { ASTVisitor } from "../../../expr-dsl/visit-ast/ast-visitor";
import { Formula } from "../../../formula/base";
import { CompileContext } from "../../types";

/**
 * Normalize batch 2: chunked process mult/div/IM chunks
 */
export class ASTNormalizer2 extends ASTVisitor<any, void> {
    public compileContext: CompileContext;
    public targetFormula: Formula;

    constructor(compileContext: CompileContext, targetFormula: Formula) {
        super();
        this.compileContext = compileContext;
        this.targetFormula = targetFormula;
    }

    // 增加 default 支持，为所有不匹配的分支重定向到 default 分支
    public visit(node: any, context: void): any {
        const type = node.type;
        if (type && type in this) {
            return this.visit(node, context);
        } else {
            return this.default(node, context);
        }
    }

    public default<T extends { type: string } | any[]>(node: T, context: void): T {
        if (Array.isArray(node)) {
            return node.map(item => this.visit(item, context)) as T;
        }
        node = { ...node };
        const paths = getASTChildPaths(node);
        for (const path of paths) {
            const child = getChildByPath(node, path);
            if (child) {
                setChildByPath(node, path, this.visit(child, context));
            }
        }
        return node;
    }
}

import './multDivLevel';
