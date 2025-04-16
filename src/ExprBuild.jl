module ExprBuild

# 导出核心组件
export ExprNode, AssignmentNode, EquationNode
export @expl, parse_expression
export find_dependencies, substitute
export compile_to_desmos

# 包含核心组件
include("core/ExprNode.jl")
include("core/Macros.jl")
include("core/Dependencies.jl")
include("core/DesmosCompiler.jl")

end # module