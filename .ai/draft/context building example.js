
const mosaicGrid = expl.With
    `Points = ${ For`i = [0, ..., ${N} - 1], j = [0, ..., ${N} - 1]`(({ i, j }) =>
        expr`(${i}, ${j})`
    ) },
    Filter = ${ For`i = [0, ..., ${N} - 1], j = [0, ..., ${N} - 1]`(({ i, j }) =>
        expr`mod(${i} + ${j}, 2)`
    ) },`
    (({ Points, Filter }) =>
        For`P = ${Points} [ ${Filter} = 0 ]`(({ P }) =>
            expr`polygon( ${P}, ${P} + (1, 0), ${P} + (1, 1), ${P} + (0, 1))`
        )
    )
    .id("mosaicGrid")
    .realName("M_osaicGrid")
    .style({
        color: "red",
        line: { width: 2 },
        fill: { opacity: 0.5 },
    });

// 创作形式支持的 免解包写法
const mosaicGrid2 = expl.With
    `Points = ${ For`i = [0 ... ${N} - 1], j = [0 ... ${N} - 1]`((i, j) => expr`( ${i}, ${j} )`) },
    Filter = ${ For`i = [0 ... ${N} - 1], j = [0 ... ${N} - 1]`((i, j) => expr`mod( ${i} + ${j}, 2)`) }`
    ((Points, Filter) =>
        For`P = ${Points} [ ${Filter} = 0 ]`((P) =>
            expr`polygon( ${P}, ${P} + (1, 0), ${P} + (1, 1), ${P} + (0, 1))`
        )
    )
    .id("mosaicGrid2")
    .realName("M_osaicGrid2")
    .style({
        color: "red",
        line: { width: 2 },
        fill: { opacity: 0.5 },
    })

// 纯 DSL 写法
const mosaicGrid3 = expl`
    polygon(P, P + (1, 0), P + (1, 1), P + (0, 1)) 
        for P = Points[Filter = 0]
        with
            Points = [(i, j) for i = [0...${N}-1], j = [0...${N}-1]],
            Filter = [mod(i + j, 2) for [0...${N}-1], j = [0...${N}-1]]`
    .id("mosaicGrid3")
    .realName("M_osaicGrid3")
    .style({
        color: "red",
        line: { width: 2 },
        fill: { opacity: 0.5 },
    })

// 纯 DSL 写法 2
const mosaicGrid4 = expl`
    [
        polygon(P, P + (1, 0), P + (1, 1), P + (0, 1)) 
        for P = Points[Filter = 0]
    ] with
        Points = [(i, j) for i = [0...${N}-1], j = [0...${N}-1]],
        Filter = [mod(i + j, 2) for i = [0...${N}-1], j = [0...${N}-1]]
    `.id("mosaicGrid4")
    .realName("M_osaicGrid4")
    .style({
        color: "red",
        line: { width: 2 },
        fill: { opacity: 0.5 },
    })

// 纯 DSL 写法 3
// with, for 的前置型写法
// 由于 with, for 默认是后置型写法，而且 with 的作用范围倾向于划的很广
// 所以可能需要硬性要求前置型写法的 with / for 后面紧跟两对圆括号（第二对也可以是中括号，兼容 for 表达式 / 列表定义式）
// 或者另一个方法是要求前置型改名为 For 和 With，和后置型保持差异
const mosaicGrid5 = expl`
    with (
        Points = [(i, j) for i = [0...${N}-1], j = [0...${N}-1]],
        Filter = [mod(i + j, 2) for i = [0...${N}-1], j = [0...${N}-1]]
    ) [
        for (P = Points[Filter = 0]) (
            polygon(P, P+(1, 0), P+(1, 1), P+(0, 1)) 
        )
    ]
    `.id("mosaicGrid5")
    .realName("M_osaicGrid5")
    .style({
        color: "red",
        line: { width: 2 },
        fill: { opacity: 0.5 },
    })