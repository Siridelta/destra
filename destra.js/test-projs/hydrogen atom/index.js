import { expr, expl, Graph } from "../../variant-drafts/v-id-mutable/src/core";

// Orbital Functions

const asscLaguerrePolynomial = expl`(n, alpha, x) =>
    sum(k = 0, n) (
        nCr(n + alpha, n - k) * (-x)^k / k!
    )
`.id('L_r');

const radialWavefunction = expl`(n, l, r) =>
    ( 
        (2 / n)^3 
        * (n - l - 1)! 
        / ( 
            2n * (n + l)! 
        ) 
    )^(1/2) 
    * exp(-r / n)
    * (2r / n)^l 
    * ${asscLaguerrePolynomial}(n - l - 1, 2l + 1, 2r / n)
`.id('R');

const legendrePolynomial = expl`(l, m, x) => 
    (-1)^m / 2^l
    * (1 - x^2)^(m/2)
    * sum(k = 0, floor((l - m) / 2)) (
        (-1)^k 
        * (2l - 2k)! 
        / (
           k! * (l - m - 2k)! * (l - k)!
        ) 
        * x^(l - m - 2k)
    )
`.id('P_r');

const sphericalHarmonic = expl`(l, m, theta, phi) =>
    (-1)^m 
    * sqrt(
        (2l + 1) / 4 pi
        * (l - m)! / (l + m)!
    ) 
    * ${legendrePolynomial}(l, m, cos(theta))
    * exp(i * m * phi)
`.id('Y');

const wavefunction = expl`(n, l, m, p) =>
    ${radialWavefunction}(n, l, p) 
    * ${sphericalHarmonic}(l, m, theta, phi)
    with
        r = |p|,
        theta = atan(|(p.x, p.y)|, p.z),
        phi = atan(p.y, p.x),

`.id('psi');

// Function to visualize
const scale = expl`16 in 0:1:20`;
const Psi = expl`(p) => real(${wavefunction}(5, 3, 1, p * ${scale})) `
    .id('Psi');



// --- Scatter plot core ---

const P = expl`[]`;
const N = expl`[]`;

const M = expl` 
    (W0 * W00).total / W00.total
    with
        W0 = |join(${Psi}(${P}), ${Psi}(${N}))|,
        W00 = |join(${Psi}(${P}), ${Psi}(${N}))|^2
`;

// mysterious mapping function
const T = expl`(w) => .5 min( |w|/${M}, 1) ^ 1.5 `;
const cT = expl`(w) => .7 min( |w|/${M}, 1) ^ 1.5 `;

// colors
const colorPositive = expl` hsv(2, ${cT}(|${Psi}(${P})|) * 0.68, 0.78) `
const colorNegative = expl` hsv(210, ${cT}(|${Psi}(${N})|) * 0.75, 0.7) `
P.color(colorPositive).point({size: expr`${T}(|${Psi}(${P})|)`})
N.color(colorNegative).point({size: expr`${T}(|${Psi}(${N})|)`})

// batch point
const n = expl`1000`;
const n1 = expl`9500`;
const s = expl`0 in 0:1`;
const p = expl`
    10(u, v, w)
    with
        u = random(${n}, ${s}),
        v = random(${n}, ${s}+1),
        w = random(${n}, ${s}+2),
`
const W = expl` ${Psi}(${p}) `;
const P_d = expl` ${p}[ ${W}.max random(${n}, ${s}-1) <= ${W} ] `;
const N_d = expl` ${p}[ -${W}.max random(${n}, ${s}-1) > ${W} ] `;

// --- Run Action ---

const R1 = expl`
    ${P} -> {
        ${P}.count + ${P_d}.count > ${n1} 
            : join(
                ${P}[ ${P}.count + ${P_d}.count - ${n1} + 1 ...],
                ${P_d}
            ),
        join( ${P}, ${P_d} )
    },
    ${N} -> {
        ${N}.count + ${N_d}.count > ${n1} 
            : join(
                ${N}[ ${N}.count + ${N_d}.count - ${n1} + 1 ...],
                ${N_d}
            ),
        join( ${N}, ${N_d} )
    },
    ${s} -> mod(${s} + 0.001, 1)
`

const resetAction = expr`
    ${P} -> [],
    ${N} -> [],
    ${s} -> random(),
`

const graph = new Graph({
    root: [
        R1,
        resetAction,
        P,
        N,
    ],
    ticker: {
        handler: R1,
        playing: true,
        open: true,
    },
})