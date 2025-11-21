
c = For`a = 3, b = ${expr`4`}` (ctx =>

    expr`${ctx.a}^2 + ${ctx.b}^2`
    
); 

c1 = For`a = 3, b = ${expr`4`}` (({a, b}) =>

    expr`${a}^2 + ${b}^2`
    
); 

sigmoid = Fn`x` (ctx =>
    expr`1 / (1 + e^(-${ctx.x}))`
);

sigmoid2 = expl`(x) => 1 / (1 + e^(-x))`