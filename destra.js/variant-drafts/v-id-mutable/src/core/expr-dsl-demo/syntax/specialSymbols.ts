// 特殊符号(希腊字母等，通常需要 IDE 提供对例如 ":alpha" 这样的指令（自动补全）的支持)

type SpecialSymbolsMapPage = {
    readonly aliases: readonly string[];
    readonly chars: readonly string[];
    readonly map: {
        readonly [I in SpecialSymbolsMapPage["aliases"][number]]: SpecialSymbolsMapPage["map"][I];
    }
}

export const specialSymbolsPaged = {
    "greekLowerCase": {
        aliases: [
            "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega",
        ],
        chars: [
            "α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω",
        ],
        map: {
            alpha: 'α',
            beta: 'β',
            gamma: 'γ',
            delta: 'δ',
            epsilon: 'ε',
            zeta: 'ζ',
            eta: 'η',
            theta: 'θ',
            iota: 'ι',
            kappa: 'κ',
            lambda: 'λ',
            mu: 'μ',
            nu: 'ν',
            xi: 'ξ',
            omicron: 'ο',
            pi: 'π',
            rho: 'ρ',
            sigma: 'σ',
            tau: 'τ',
            upsilon: 'υ',
            phi: 'φ',
            chi: 'χ',
            psi: 'ψ',
            omega: 'ω',
        },
    },
    "greekUpperCase": {
        aliases: [
            "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi", "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega",
        ],
        chars: [
            "Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Ι", "Κ", "Λ", "Μ", "Ν", "Ξ", "Ο", "Π", "Ρ", "Σ", "Τ", "Υ", "Φ", "Χ", "Ψ", "Ω",
        ],
        map: {
            Alpha: 'Α',
            Beta: 'Β',
            Gamma: 'Γ',
            Delta: 'Δ',
            Epsilon: 'Ε',
            Zeta: 'Ζ',
            Eta: 'Η',
            Theta: 'Θ',
            Iota: 'Ι',
            Kappa: 'Κ',
            Lambda: 'Λ',
            Mu: 'Μ',
            Nu: 'Ν',
            Xi: 'Ξ',
            Omicron: 'Ο',
            Pi: 'Π',
            Rho: 'Ρ',
            Sigma: 'Σ',
            Tau: 'Τ',
            Upsilon: 'Υ',
            Phi: 'Φ',
            Chi: 'Χ',
            Psi: 'Ψ',
            Omega: 'Ω',
        },
    },
    "others": {
        aliases: ["infty"],
        chars: ["∞"],
        map: {
            infty: '∞',
        },
    },
} as const satisfies Record<string, SpecialSymbolsMapPage>;

export const specialSymbolsAliases = [
    ...specialSymbolsPaged.greekLowerCase.aliases,
    ...specialSymbolsPaged.greekUpperCase.aliases,
    ...specialSymbolsPaged.others.aliases,
] as const;

export const specialSymbolsChars = [
    ...specialSymbolsPaged.greekLowerCase.chars,
    ...specialSymbolsPaged.greekUpperCase.chars,
    ...specialSymbolsPaged.others.chars,
] as const;

type SpecialSymbolsMapPart<PageKey extends keyof typeof specialSymbolsPaged> = {
    readonly [K in keyof (typeof specialSymbolsPaged)[PageKey]["map"]]: (typeof specialSymbolsPaged)[PageKey]["map"][K];
}
type SpecialSymbolsMap0 = 
    & SpecialSymbolsMapPart<"greekLowerCase"> 
    & SpecialSymbolsMapPart<"greekUpperCase"> 
    & SpecialSymbolsMapPart<"others">;
type SpecialSymbolsMap = {
    readonly [K in keyof SpecialSymbolsMap0]: SpecialSymbolsMap0[K];
}
export const specialSymbolsMap = 
    Object.fromEntries(
        Object.values(specialSymbolsPaged)
            .flatMap(page => Object.entries(page.map))
    ) as SpecialSymbolsMap;