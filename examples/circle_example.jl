# ExprBuild-Julia 示例：圆方程

# 导入 ExprBuild 模块
using ExprBuild
using JSON

# 定义变量
a = @expl a = 3
b = @expl b = 4

println("创建变量 a = 3 和 b = 4")
println("a: ", a)
println("b: ", b)

# 定义圆方程
circle = @expl x^2 + y^2 = a^2 + b^2

println("\n创建圆方程: x^2 + y^2 = a^2 + b^2")
println("circle: ", circle)

# 查找依赖关系
deps = find_dependencies(circle)
println("\n圆方程的依赖变量: ", deps)

# 替换变量
replacements = Dict(:a => 5, :b => 12)
new_circle = substitute(circle, replacements)
println("\n替换变量 (a=5, b=12) 后的圆方程:")
println("new_circle: ", new_circle)

# 编译为 Desmos 状态
desmos_state = compile_to_desmos([a, b, circle])
println("\n编译为 Desmos 状态:")
println(JSON.json(desmos_state, 2))

# 保存 Desmos 状态到文件
save_to_desmos_state(desmos_state, "circle.json")
println("\nDesmos 状态已保存到 circle.json")

println("\n示例完成！你可以将 circle.json 导入到 Desmos 图形计算器中查看结果。")

# 使用说明
println("""

使用步骤：
1. 运行此示例: julia circle_example.jl
2. 查看生成的 circle.json 文件
3. 访问 https://www.desmos.com/calculator
4. 点击右上角的三个点 → 从文件导入 → 选择 circle.json

这将在 Desmos 中显示我们创建的圆方程图形。
""")