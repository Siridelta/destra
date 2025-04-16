# 宏系统实现

"""
    @expl(expr)

捕获表达式并创建适当的 ExprNode 对象

# 参数
- `expr`: 要捕获的表达式

# 返回
- 解析后的表达式节点

# 示例
```julia
a = @expl a = 3
circle = @expl x^2 + y^2 = r^2
```
"""
macro expl(expr)
    # 分析表达式并创建适当的 ExprNode 对象
    return :(parse_expression($(QuoteNode(expr))))
end

"""
    @expl_interpolate(expr)

捕获表达式并支持插值，允许在表达式中引用其他表达式节点

# 参数
- `expr`: 要捕获的表达式，可包含 `$(...)` 形式的插值

# 返回
- 解析后的表达式节点

# 示例
```julia
a = @expl a = 3
b = @expl b = 4
circle = @expl_interpolate x^2 + y^2 = $(a)^2 + $(b)^2
```
"""
macro expl_interpolate(expr)
    # 处理表达式中的插值
    return quote
        # 在运行时解析表达式
        local parsed_expr = $(Expr(:quote, expr))
        # 处理插值并创建节点
        parse_expression_with_interpolation(parsed_expr)
    end
end

"""
    parse_expression_with_interpolation(expr)

解析包含插值的表达式

# 参数
- `expr`: 包含插值的表达式

# 返回
- 解析后的表达式节点
"""
function parse_expression_with_interpolation(expr)
    # 递归处理表达式中的插值
    if expr isa Expr
        if expr.head == :$
            # 处理插值表达式 $(var)
            return eval(expr.args[1])
        else
            # 递归处理子表达式
            new_args = [parse_expression_with_interpolation(arg) for arg in expr.args]
            return Expr(expr.head, new_args...)
        end
    else
        # 基本类型直接返回
        return expr
    end
end