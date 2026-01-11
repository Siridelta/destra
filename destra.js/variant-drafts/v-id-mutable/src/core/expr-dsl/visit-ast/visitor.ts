export abstract class ASTVisitor<R, C = void> {
    public visit(node: any, context: C): R {
        // 根据 node.type 动态分发方法
        // 例如: node.type === 'piecewiseExp' -> this.piecewiseExp(node, context)
        const type = node.type;
        const method = type && type in this 
                ? this[type as keyof typeof this] 
                : null;
        if (method instanceof Function) {
            return method.call(this, node, context);
        } else {
            throw new Error(`Expected visitor branch '${type}' is not callable`);
        }
    }
}