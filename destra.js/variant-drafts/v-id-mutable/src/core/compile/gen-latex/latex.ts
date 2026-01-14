export const l = {

    // comparison operators
    '>': '>',
    '>=': '\\ge',
    '<': '<',
    '<=': '\\le',
    '=': '=',
    '==': '=',

    '~': '\\sim ',
    '->': '\\to ',
    
    'opName': (name: string) => `\\operatorname{${name}}`,

    '*': '\\cdot',
    '/': (lhs: string, rhs: string) => `\\frac{${lhs}}{${rhs}}`,
    '%of': `\\%\\operatorname{of}`,
    'cross': '\\times',
}