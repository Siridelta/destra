import P from 'parsimmon';

// ----------------------------------------------------------------------------
// Types & AST Nodes
// ----------------------------------------------------------------------------

type Node = 
  | { type: 'Number'; value: number }
  | { type: 'Identifier'; value: string }
  | { type: 'String'; value: string }
  | { type: 'List'; elements: Node[] }
  | { type: 'Range'; start: Node; end: Node }
  | { type: 'FunctionCall'; callee: string; args: Node[] }
  | { type: 'BinaryExpression'; operator: string; left: Node; right: Node };

// ----------------------------------------------------------------------------
// Grammar Definition
// ----------------------------------------------------------------------------

const DestraLang = P.createLanguage({
  // --- Lexical ---
  
  // Whitespace: spaces, tabs, newlines
  _: () => P.optWhitespace,
  
  // Number: integers and decimals
  Number: () => 
    P.regexp(/-?(0|[1-9][0-9]*)(\.[0-9]+)?/)
      .map(Number)
      .map(n => ({ type: 'Number', value: n })),

  // Identifier: letters, digits, underscores, but starts with letter/underscore
  Identifier: () => 
    P.regexp(/[a-zA-Z_][a-zA-Z0-9_]*/)
      .desc('identifier'),
      
  // String: simple single quoted string
  String: () => 
    P.regexp(/'((?:\\.|[^\\'])*)'/, 1)
      .map(s => ({ type: 'String', value: s })),

  // --- Expressions ---

  // Atomic expressions
  Atom: (r) => P.alt(
    r.FunctionCall,
    r.IdentifierNode,
    r.Number,
    r.String,
    r.List,
    r.Range,
    r.Parenthesized
  ).trim(r._),

  IdentifierNode: (r) => 
    r.Identifier.map(id => ({ type: 'Identifier', value: id })),

  Parenthesized: (r) => 
    P.string('(').then(r.Expression).skip(P.string(')')),

  // Function Call: f(x, y)
  FunctionCall: (r) => 
    P.seqMap(
      r.Identifier,
      P.string('(').trim(r._),
      r.Expression.sepBy(P.string(',').trim(r._)),
      P.string(')'),
      (id, _, args, __) => ({ type: 'FunctionCall', callee: id, args })
    ),

  // List: [1, 2, 3] or [1...10]
  // Note: Range [start...end] notation conflict with list [a, b, c].
  // We need to distinguish them. 
  // Range syntax in Destra doc example: [1...10]
  ListContent: (r) => P.alt(
    // Range: Expression ... Expression
    P.seqMap(
        r.Expression,
        P.string('...').trim(r._),
        r.Expression,
        (start, _, end) => ({ type: 'Range', start, end })
    ),
    // Normal List: Expression, Expression, ...
    r.Expression.sepBy(P.string(',').trim(r._))
      .map(elements => ({ type: 'List', elements }))
  ),

  List: (r) => 
    P.string('[').trim(r._)
      .then(r.ListContent)
      .skip(P.string(']')),
      
  // Range as a standalone expression is typically inside brackets in Desmos, 
  // but if we support "1...10" directly, we can add it. 
  // For now, only inside brackets as per 'ListContent'.
  // If 'Range' is needed outside, we'd add it to Atom or hierarchy, but usually ranges are list constructors.
  // Actually, 'Range' inside Atom logic would be tricky if valid syntax is just "1...10". 
  // Let's assume ranges are enclosed in brackets for this playground.
  Range: (r) => 
    P.fail('Range should be inside brackets [...]'),

  // --- Operator Precedence ---
  
  // Helper for left-associative binary ops
  // level 1: + -
  // level 2: * /
  // level 3: ^ (right associative usually, or left)
  
  // Power: Atom ^ Atom ^ ... (Right associative is standard for power, but let's do simple left for prototype or right)
  // Let's do right associative for power: Atom ^ Power | Atom
  Power: (r) => 
    P.seqMap(
      r.Atom,
      P.string('^').trim(r._).then(r.Power).fallback(null),
      (left, right) => {
        if (!right) return left;
        return { type: 'BinaryExpression', operator: '^', left, right: right as Node };
      }
    ),

  // Product: Power * Power
  Product: (r) => 
    r.Power.sepBy1(P.alt(P.string('*'), P.string('/')).trim(r._))
      .map(chain => {
        // chain is [Node, Op, Node, Op, Node...] NO, sepBy1 returns [Node, Node, Node]
        // Wait, sepBy1 only returns values. We need operators.
        // We need a different approach for mixing operators.
        return chain.reduce((acc, curr) => {
            // This reduction logic is wrong because we lost operators.
            return acc; 
        });
        // Better manual chain parsing:
    }),
    
  // Correct Binary Op Helper
  // We parse: Head (Op Tail)*
  
  ProductChain: (r) => 
    P.seqMap(
        r.Power, 
        P.seq(
            P.alt(P.string('*'), P.string('/')).trim(r._), 
            r.Power
        ).many(),
        (first, rest) => {
            return rest.reduce((acc, [op, right]) => {
                return { type: 'BinaryExpression', operator: op, left: acc, right };
            }, first);
        }
    ),

  SumChain: (r) => 
    P.seqMap(
        r.ProductChain, 
        P.seq(
            P.alt(P.string('+'), P.string('-')).trim(r._), 
            r.ProductChain
        ).many(),
        (first, rest) => {
            return rest.reduce((acc, [op, right]) => {
                return { type: 'BinaryExpression', operator: op, left: acc, right };
            }, first);
        }
    ),

  Expression: (r) => r.SumChain.trim(r._)
});

// ----------------------------------------------------------------------------
// Test Runner
// ----------------------------------------------------------------------------

const examples = [
  "1 + 2 * 3",
  "(1 + 2) * 3",
  "sin(3.14)",
  "f(x, y + 1)",
  "2 ^ 3 ^ 4",
  "[1, 2, 3]",
  "[1 ... 10]",
  "point(1, 2) + point(3, 4)",
  "1 + 2 * 3 ^ 2"
];

console.log("=== Parsimmon Parser Prototype ===");

examples.forEach(code => {
  console.log(`\nInput: "${code}"`);
  const result = DestraLang.Expression.tryParse(code);
  console.log(JSON.stringify(result, null, 2));
});

