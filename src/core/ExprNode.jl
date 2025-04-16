# 核心表达式节点类型定义

"""
抽象类型 ExprNode 是所有表达式节点的基类
"""
abstract type ExprNode end

"""
    AssignmentNode <: ExprNode

表示变量赋值表达式，如 `a = 3`

# 字段
- `var_name::Symbol`: 变量名
- `value::Any`: 变量值
"""
struct AssignmentNode <: ExprNode
    var_name::Symbol
    value::Any
end

"""
    EquationNode <: ExprNode

表示等式表达式，如 `x^2 + y^2 = r^2`

# 字段
- `lhs::Any`: 等式左侧
- `rhs::Any`: 等式右侧
"""
struct EquationNode <: ExprNode
    lhs::Any
    rhs::Any
end

"""
    FunctionNode <: ExprNode

表示函数定义，如 `f(x) = x^2`

# 字段
- `name::Symbol`: 函数名
- `args::Vector{Symbol}`: 参数列表
- `body::Any`: 函数体
"""
struct FunctionNode <: ExprNode
    name::Symbol
    args::Vector{Symbol}
    body::Any
end

"""
    ListNode <: ExprNode

表示列表表达式，如 `[1, 2, 3]`

# 字段
- `items::Vector{Any}`: 列表项
"""
struct ListNode <: ExprNode
    items::Vector{Any}
end

"""
    parse_expression(expr)

解析 Julia 表达式并创建适当的 ExprNode 对象

# 参数
- `expr`: Julia 表达式

# 返回
- `ExprNode`: 解析后的表达式节点
"""
function parse_expression(expr)
    # 处理赋值表达式 (a = 3)
    if expr.head == :(=) && expr.args[1] isa Symbol
        return AssignmentNode(expr.args[1], expr.args[2])
    
    # 处理等式 (x^2 + y^2 = r^2)
    elseif expr.head == :(=)
        return EquationNode(expr.args[1], expr.args[2])
    
    # 处理函数定义 (f(x) = x^2)
    elseif expr.head == :function
        func_sig = expr.args[1]
        func_name = func_sig.args[1]
        func_args = [arg isa Symbol ? arg : arg.args[1] for arg in func_sig.args[2:end]]
        func_body = expr.args[2]
        return FunctionNode(func_name, func_args, func_body)
    
    # 处理列表 ([1, 2, 3])
    elseif expr.head == :vect
        return ListNode(expr.args)
    
    # 其他表达式类型...
    else
        error("不支持的表达式类型: $(expr.head)")
    end
end

# 字符串表示方法
function Base.show(io::IO, node::AssignmentNode)
    print(io, "$(node.var_name) = $(node.value)")
end

function Base.show(io::IO, node::EquationNode)
    print(io, "$(node.lhs) = $(node.rhs)")
end

function Base.show(io::IO, node::FunctionNode)
    args_str = join(node.args, ", ")
    print(io, "$(node.name)($(args_str)) = $(node.body)")
end

function Base.show(io::IO, node::ListNode)
    items_str = join(node.items, ", ")
    print(io, "[$(items_str)]")
end