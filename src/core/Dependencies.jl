# 依赖追踪系统实现

using Symbolics

"""
    find_dependencies(expr)

分析表达式并找出其依赖的变量

# 参数
- `expr`: 表达式节点或符号表达式

# 返回
- `Vector{Symbol}`: 依赖变量列表
"""
function find_dependencies(expr)
    if expr isa AssignmentNode
        # 对于赋值表达式，分析右侧值的依赖
        return find_dependencies_in_expr(expr.value)
    elseif expr isa EquationNode
        # 对于等式，合并两侧的依赖
        lhs_deps = find_dependencies_in_expr(expr.lhs)
        rhs_deps = find_dependencies_in_expr(expr.rhs)
        return unique(vcat(lhs_deps, rhs_deps))
    elseif expr isa FunctionNode
        # 对于函数，分析函数体中的依赖，排除参数
        body_deps = find_dependencies_in_expr(expr.body)
        return setdiff(body_deps, expr.args)
    else
        # 其他类型的表达式
        return find_dependencies_in_expr(expr)
    end
end

"""
    find_dependencies_in_expr(expr)

递归分析表达式中的符号依赖

# 参数
- `expr`: Julia 表达式

# 返回
- `Vector{Symbol}`: 依赖变量列表
"""
function find_dependencies_in_expr(expr)
    deps = Symbol[]
    
    if expr isa Symbol
        # 单个符号直接添加
        push!(deps, expr)
    elseif expr isa Expr
        # 递归处理表达式的各个部分
        for arg in expr.args
            append!(deps, find_dependencies_in_expr(arg))
        end
    end
    
    # 返回唯一的依赖列表
    return unique(deps)
end

"""
    substitute(expr, replacements::Dict)

在表达式中替换变量

# 参数
- `expr`: 表达式节点
- `replacements`: 变量替换字典，键为符号，值为替换值

# 返回
- 替换后的表达式节点
"""
function substitute(expr, replacements::Dict)
    if expr isa AssignmentNode
        # 替换赋值表达式右侧
        new_value = substitute_in_expr(expr.value, replacements)
        return AssignmentNode(expr.var_name, new_value)
    elseif expr isa EquationNode
        # 替换等式两侧
        new_lhs = substitute_in_expr(expr.lhs, replacements)
        new_rhs = substitute_in_expr(expr.rhs, replacements)
        return EquationNode(new_lhs, new_rhs)
    elseif expr isa FunctionNode
        # 替换函数体，但不替换参数
        local_replacements = copy(replacements)
        for arg in expr.args
            delete!(local_replacements, arg)
        end
        new_body = substitute_in_expr(expr.body, local_replacements)
        return FunctionNode(expr.name, expr.args, new_body)
    else
        # 其他类型的表达式
        return substitute_in_expr(expr, replacements)
    end
end

"""
    substitute_in_expr(expr, replacements::Dict)

递归替换表达式中的符号

# 参数
- `expr`: Julia 表达式
- `replacements`: 变量替换字典

# 返回
- 替换后的表达式
"""
function substitute_in_expr(expr, replacements::Dict)
    if expr isa Symbol && haskey(replacements, expr)
        # 替换单个符号
        return replacements[expr]
    elseif expr isa Expr
        # 递归替换表达式的各个部分
        new_args = [substitute_in_expr(arg, replacements) for arg in expr.args]
        return Expr(expr.head, new_args...)
    else
        # 其他情况直接返回原表达式
        return expr
    end
end