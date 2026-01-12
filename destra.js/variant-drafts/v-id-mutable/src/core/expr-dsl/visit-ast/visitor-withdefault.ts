import { getASTChildPaths, getChildByPath, setChildByPathImmutable } from "../parse-ast/sematics/traverse-ast";
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
            if (child) {
                node = setChildByPathImmutable(node, path, this.visit(child, context));
            }
        }
        return node;
    }
    
    // A version even not depend on predefined child paths
    // will try direct childs and elements in direct-child array
    // public default<T extends { type: string }>(node: T, context: C): T {
    //     for (const [k, v] of Object.entries(node) as [keyof T, any][]) {
    //         if (hasType(v))
    //             node[k] = this.visit(v, context) as any;
    //         else if (Array.isArray(v))
    //             node[k] = v.map(item => this.visit(item, context)) as T[keyof T];
    //     }
    //     return node;
    // }
}