# FAQ

## Q: Bernard.jl 与 Desmos 的官方 API 有什么区别？
A: Bernard.jl 是一个社区粉丝项目，不是 Desmos 官方产品。它提供了一个编程框架来构建 Desmos 图表，而 Desmos 官方 API 主要是为了在网页中嵌入 Desmos 计算器。

## Q: 为什么选择 Julia 作为潜在的实现语言？
A: Julia 的语法极其接近数学表达习惯，支持隐式乘法、Unicode 数学符号和标准数学运算符优先级，同时具有强大的元编程能力和丰富的科学计算生态。

## Q: 使用 Symbolics.jl 和自建对象系统各有哪些优劣势？
A: Symbolics.jl 可以充分利用 Julia 已有的符号计算能力，但可能需要适配 Desmos 特性；自建对象系统能更精确设计符合 Desmos 特性的模型，但开发工作量大。

## Q: Bernard.jl 如何处理 Desmos 表达式之间的依赖关系？
A: Bernard.jl 设计了依赖管理系统，包括依赖识别、依赖图构建、冲突检测和变量替换优化，确保表达式之间的依赖关系符合 Desmos 的约束规则。

## Q: 项目的当前主要挑战是什么？
A: 当前主要挑战包括：完善对 Desmos 机制的建模、决定使用 Julia 还是其他语言、选择使用现有符号计算库还是自建对象系统等。

## Q: Bernard.jl 与其他数学软件的关系是什么？
A: Bernard.jl 专注于 Desmos 图形计算器，不是一个通用的数学软件。它的目标是帮助 Desmos 社区创作者更便捷地创建复杂的 Desmos 图表，而非替代 Mathematica、MATLAB 等专业数学工具。

> 本文件持续更新，欢迎补充其他常见问题。 