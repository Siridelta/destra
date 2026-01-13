import { getASTChildPaths, getChildByPath, setChildByPath, setChildByPathImmutable } from "../parse-ast/sematics/traverse-ast";
import { ASTVisitor } from "./visitor";

/**
 * ASTVisitor with default support
 */
export class ASTVisitorWithDefault<R, C> extends ASTVisitor<R, C> {

    // 增加 default 支持，为所有不匹配的分支重定向到 default 分支
    public visit(node: any, context: C): R {
        const type = node.type;
        if (!type) return node;
        if (type in this) {
            return super.visit(node, context);
        } else {
            return this.default(node, context);
        }
    }

    // note: change AST immutably
    public default<T extends { type: string }>(node: T, context: C): T {
        const paths = getASTChildPaths(node);
        for (const path of paths) {
            const child = getChildByPath(node, path);
            if (!child) continue;
            if (child.type === 'undefinedVar' || child.type === 'ctxVarDef')
                setChildByPath(node, path, this.visit(child, context));
            else
                node = setChildByPathImmutable(node, path, this.visit(child, context));
        }
        return node;
    }

}