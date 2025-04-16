# ExprBuild-Julia 测试套件

using Test
using ExprBuild

@testset "ExprBuild.jl" begin
    @testset "表达式节点" begin
        # 测试赋值节点
        a_node = @expl a = 3
        @test a_node isa AssignmentNode
        @test a_node.var_name == :a
        @test a_node.value == 3
        
        # 测试等式节点
        eq_node = @expl x^2 + y^2 = r^2
        @test eq_node isa EquationNode
        @test eq_node.lhs.head == :call
        @test eq_node.lhs.args[1] == :+
        @test eq_node.rhs.head == :call
        @test eq_node.rhs.args[1] == :^
    end
    
    @testset "依赖追踪" begin
        # 创建表达式
        a = @expl a = 3
        b = @expl b = 4
        circle = @expl x^2 + y^2 = a^2 + b^2
        
        # 测试依赖查找
        deps = find_dependencies(circle)
        @test :a in deps
        @test :b in deps
        @test :x in deps
        @test :y in deps
        
        # 测试变量替换
        new_circle = substitute(circle, Dict(:a => 5, :b => 12))
        @test new_circle isa EquationNode
        # 这里可以添加更详细的检查替换结果的测试
    end
    
    @testset "Desmos 编译" begin
        # 创建表达式
        a = @expl a = 3
        
        # 测试编译
        state = compile_to_desmos(a)
        @test state isa Dict
        @test haskey(state, "version")
        @test haskey(state, "expressions")
        @test haskey(state["expressions"], "list")
        @test length(state["expressions"]["list"]) == 1
        @test state["expressions"]["list"][1]["latex"] == "a = 3"
    end
end