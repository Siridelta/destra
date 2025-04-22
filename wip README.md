# ExprBuild-Julia

ExprBuild-Julia 是一个为 Desmos 图形计算器爱好者设计的开发框架，基于 Julia 语言实现。它允许通过编程方式构建和管理复杂的 Desmos 图表，简化创作过程。

## 项目概述

ExprBuild 致力于解决 Desmos 原生界面在处理复杂图表时的局限性，通过提供编程接口，使创作者能够：

- 通过编程方式管理大量表达式
- 使用接近数学习惯的自然语法
- 自动追踪和处理表达式之间的依赖关系
- 获得实时反馈和预览
- 利用编程语言的优势进行批量操作

## 特点

- **自然的数学语法**：利用 Julia 的语法特性，支持隐式乘法、Unicode 数学符号等
- **强大的元编程能力**：通过宏系统捕获和处理表达式
- **依赖追踪**：自动分析和管理表达式之间的依赖关系
- **Desmos 集成**：将表达式编译为 Desmos 可用的状态格式

## 快速开始

### 安装

```julia
# 进入包管理模式
]add https://github.com/your-username/ExprBuild-Julia.git
```

### 基本用法

```julia
using ExprBuild

# 定义变量
a = @expl a = 3
b = @expl b = 4

# 定义圆方程
circle = @expl x^2 + y^2 = a^2 + b^2

# 编译为 Desmos 状态
desmos_state = compile_to_desmos([a, b, circle])

# 保存到文件
save_to_desmos_state(desmos_state, "circle.json")
```

## 项目结构

```
ExprBuild-Julia/
├── src/                  # 源代码目录
│   ├── ExprBuild.jl      # 主模块文件
│   ├── core/             # 核心表达式系统
│   ├── server/           # Genie.jl 服务器组件 (计划中)
│   └── frontend/         # 前端资源 (计划中)
├── examples/             # 示例目录
├── test/                 # 测试目录 (计划中)
└── working-notes/        # 工作笔记
```

## 开发指南

请查看 [开始指南](working-notes/开始指南.md) 了解详细的开发流程和下一步计划。

## 贡献

ExprBuild-Julia 是一个开源项目，欢迎贡献代码、报告问题或提出改进建议。

## 许可证

MIT