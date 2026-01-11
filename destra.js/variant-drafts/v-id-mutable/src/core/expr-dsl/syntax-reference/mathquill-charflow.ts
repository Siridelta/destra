
// In mathquill there is an imaginary 'char flow'. 
// Inputs will be first converted to its raw keyboard inputs (even though it had been already resolved to LaTeX), to a charflow.
// then the charflow will be tokenized like a lexer, but if any longer tokens are found, longer ones have priority.
// 
// To avoid ambiguity, we need to predict how our dsl's expected latex would be reduced into the charflow, 
// and test if it would resolve to something else, which is not expected.

import { builtInFuncs } from "./reservedWords";
import { specialSymbolsAliases, specialSymbolsMap } from "./specialSymbols";

// images in charflow if not identical to that in destra
export const reservedWordsImages: Record<string, string> = {

    'sin2': 'sin',  // the square would be handled beyond charflow, so only 'sin' is considered, 
                    // and this is going to turncate a charflow until a next one opens.
    'cos2': 'cos',
    'tan2': 'tan',
    'cot2': 'cot',
    'sec2': 'sec',
    'csc2': 'csc',
    'asin': 'sin',  // to be parsed as sin^-1
    'acos': 'cos',
    'atan': 'tan',
    'acot': 'cot',
    'asec': 'sec',
    'acsc': 'csc',
    'asin2': 'arcsin',  // to be parsed as arcsin^2
    'acos2': 'arccos',
    'atan2': 'arctan',
    'acot2': 'arccot',
    'asec2': 'arcsec',
    'acsc2': 'arccsc',

    'sinh2': 'sinh',
    'cosh2': 'cosh',
    'tanh2': 'tanh',
    'coth2': 'coth',
    'sech2': 'sech',
    'csch2': 'csch',
    'asinh': 'sinh',
    'acosh': 'cosh',
    'atanh': 'tanh',
    'acoth': 'coth',
    'asech': 'sech',
    'acsch': 'csch',
    'asinh2': 'arcsinh',
    'acosh2': 'arccosh',
    'atanh2': 'arctanh',
    'acoth2': 'arccoth',
    'asech2': 'arcsech',
    'acsch2': 'arccsch',
}

export const reservedWordsThatTurncate: string[] = [
    'sin2', 'cos2', 'tan2', 'cot2', 'sec2', 'csc2',
    'asin', 'acos', 'atan', 'acot', 'asec', 'acsc',
    'asin2', 'acos2', 'atan2', 'acot2', 'asec2', 'acsc2',
    'sinh2', 'cosh2', 'tanh2', 'coth2', 'sech2', 'csch2',
    'asinh', 'acosh', 'atanh', 'acoth', 'asech', 'acsch',
    'asinh2', 'acosh2', 'atanh2', 'acoth2', 'asech2', 'acsch2',
]

export const toCharflowImage = (destraImage: string): {image: string, turncate: boolean} => {
    let image = (
        reservedWordsImages[destraImage] 
        || (specialSymbolsAliases.includes(destraImage as any) ? '$' : undefined)
        || destraImage
    );
    const turncate = (
        // predicate 1: predicted in reservedWordsThatTurncate
        reservedWordsThatTurncate.includes(destraImage)    
        // predicate 2: in specialSymbolsMap 
        || (specialSymbolsAliases.includes(destraImage as any) ? true : false)
    )
    return { image, turncate };
}

export const possibleAmbiguousImages: Set<string> = new Set([
    'width', 'height',
    ...builtInFuncs.map(func => toCharflowImage(func).image),
]);