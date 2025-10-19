
c = For`a = 3, b = ${expr`4`}` (ctx =>

    expr`${ctx.a}^2 + ${ctx.b}^2`
    
); 


// 1
const n = expl`(1, 1)`
    .point(it => it
            .size(expr`10 * ${m.x}`)
            .drag(dragNone)     // 从Bernard库里导入的常量
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