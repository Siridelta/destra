# Desmos 编译器实现

using JSON

"""
    compile_to_desmos(expr)

将表达式编译为 Desmos 状态对象

# 参数
- `expr`: 表达式节点或表达式节点数组

# 返回
- `Dict`: Desmos 状态对象
"""
function compile_to_desmos(expr)
    # 创建基本的 Desmos 状态
    state = Dict(
        "version" => 9,
        "graph" => Dict(
            "viewport" => Dict("xmin" => -10, "ymin" => -10, "xmax" => 10, "ymax" => 10)
        ),
        "expressions" => Dict("list" => [])
    )
    
    # 处理单个表达式或表达式数组
    expressions = expr isa Array ? expr : [expr]
    
    # 编译每个表达式
    for (index, expr_node) in enumerate(expressions)
        push!(state["expressions"]["list"], compile_expression(expr_node, index))
    end
    
    return state
end

"""
    compile_expression(expr, index)

将单个表达式节点编译为 Desmos 表达式对象

# 参数
- `expr`: 表达式节点
- `index`: 表达式索引

# 返回
- `Dict`: Desmos 表达式对象
"""
function compile_expression(expr, index)
    if expr isa AssignmentNode
        # 编译赋值表达式
        return Dict(
            "id" => "expr_$index",
            "type" => "expression",
            "latex" => "$(expr.var_name) = $(expr_to_latex(expr.value))"
        )
    elseif expr isa EquationNode
        # 编译等式表达式
        return Dict(
            "id" => "expr_$index",
            "type" => "expression",
            "latex" => "$(expr_to_latex(expr.lhs)) = $(expr_to_latex(expr.rhs))"
        )
    elseif expr isa FunctionNode
        # 编译函数定义
        args_str = join(expr.args, ",")
        return Dict(
            "id" => "expr_$index",
            "type" => "expression",
            "latex" => "$(expr.name)($(args_str)) = $(expr_to_latex(expr.body))"
        )
    else
        # 其他类型的表达式
        return Dict(
            "id" => "expr_$index",
            "type" => "expression",
            "latex" => expr_to_latex(expr)
        )
    end
end

"""
    expr_to_latex(expr)

将 Julia 表达式转换为 LaTeX 字符串

# 参数
- `expr`: Julia 表达式

# 返回
- `String`: LaTeX 字符串
"""
function expr_to_latex(expr)
    if expr isa Symbol
        # 符号直接转换
        return string(expr)
    elseif expr isa Number
        # 数字直接转换
        return string(expr)
    elseif expr isa String
        # 字符串加引号
        return "\"$(expr)\""
    elseif expr isa Expr
        # 根据表达式类型处理
        if expr.head == :call
            # 函数调用
            func = expr.args[1]
            args = expr.args[2:end]
            
            if func == :+
                # 加法
                return join([expr_to_latex(arg) for arg in args], " + ")
            elseif func == :-
                # 减法或负号
                if length(args) == 1
                    return "-$(expr_to_latex(args[1]))"
                else
                    return join([expr_to_latex(arg) for arg in args], " - ")
                end
            elseif func == :*
                # 乘法
                return join([expr_to_latex(arg) for arg in args], " \\cdot ")
            elseif func == :/
                # 除法
                if length(args) == 2
                    return "\\frac{$(expr_to_latex(args[1]))}{$(expr_to_latex(args[2]))}"
                else
                    error("除法表达式参数数量错误")
                end
            elseif func == :^
                # 幂
                if length(args) == 2
                    return "$(expr_to_latex(args[1]))^{$(expr_to_latex(args[2]))}"
                else
                    error("幂表达式参数数量错误")
                end
            elseif func == :sqrt
                # 平方根
                if length(args) == 1
                    return "\\sqrt{$(expr_to_latex(args[1]))}"
                else
                    error("平方根表达式参数数量错误")
                end
            else
                # 其他函数
                return "$(func)($(join([expr_to_latex(arg) for arg in args], ", ")))"
            end
        elseif expr.head == :comparison
            # 比较表达式
            result = ""
            for i in 1:2:length(expr.args)
                if i > 1
                    op = expr.args[i]
                    if op == :>
                        result *= " > "
                    elseif op == :<
                        result *= " < "
                    elseif op == :>=
                        result *= " \\ge "
                    elseif op == :<=
                        result *= " \\le "
                    elseif op == :==
                        result *= " = "
                    else
                        result *= " $(op) "
                    end
                end
                result *= expr_to_latex(expr.args[i])
            end
            return result
        else
            # 其他表达式类型
            return string(expr)
        end
    else
        # 其他类型
        return string(expr)
    end
end

"""
    save_to_desmos_state(state, filename)

将 Desmos 状态保存到文件

# 参数
- `state`: Desmos 状态对象
- `filename`: 文件名
"""
function save_to_desmos_state(state, filename)
    open(filename, "w") do io
        JSON.print(io, state)
    end
end