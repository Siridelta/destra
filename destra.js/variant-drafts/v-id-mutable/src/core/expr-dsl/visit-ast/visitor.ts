export abstract class ASTVisitor<R, C = void> {
    public visit(node: any, context: C): R {
        // 根据 node.type 动态分发方法
        // 例如: node.type === 'piecewiseExp' -> this.piecewiseExp(node, context)
        const type = node.type;
        if (!type || !(type in this))
            throw new Error(`Visitor branch '${type}' does not exist`);
        const method = this[type as keyof typeof this];
        if (method instanceof Function) {
            return method.call(this, node, context);
        } else {
            throw new Error(`Cannot call visitor branch '${type}'`);
        }
    }
}