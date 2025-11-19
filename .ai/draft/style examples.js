


// 1
const n = expl`(1, 1)`
    .point(it => it
            .size(expr`10 * ${m.x}`)
            .drag(dragNone)     // 从库里导入的常量
    )
    .label(it => it
            .content`Pos: ${n.x}, ${n.y}`
            .size(10)
    );

// 2
const n2 = expl`(1, 1)`.style(s => {
    s.point = {
        size: expr`10 * ${m.x}`,
        drag: dragNone
    }
    s.label.set({
        content: label`Pos: ${n2.x}, ${n2.y}`,
        size: 10
    });
})

const mosaicGrid = expl.with`
    Points = ${For`i = [0, ..., ${N}-1], j = [0, ..., ${N}-1]` (({i, j}) => 
        expr`(${i}, ${j})`
    )},
    Filter = ${For`i = [0, ..., ${N}-1], j = [0, ..., ${N}-1]` (({i, j}) => 
        expr`mod(${i} + ${j}, 2)`
    )},
`(({Points, Filter}) => 
    For`P = ${Points}[${Filter} = 0]`(({P}) => 
        expr`polygon(${P}, ${P}+(1, 0), ${P}+(1, 1), ${P}+(0, 1))`
    )
)
    .id("mosaicGrid")
    .realName("M_osaicGrid")
    .style({
        color: "red",
        line: { width: 2 },
        fill: { opacity: 0.5 },
    })