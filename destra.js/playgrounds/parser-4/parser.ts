import { Lexer, Token, TokenType } from "./lexer";

// --- AST Nodes ---

export type ASTNode =
  | NumberNode
  | StringNode
  | IdentifierNode
  | PrefixExpression
  | InfixExpression
  | CallExpression
  | ListExpression
  | RangeExpression;

export interface NumberNode {
  type: "NumberLiteral";
  value: number;
}

export interface StringNode {
  type: "StringLiteral";
  value: string;
}

export interface IdentifierNode {
  type: "Identifier";
  name: string;
}

export interface PrefixExpression {
  type: "PrefixExpression";
  operator: string;
  right: ASTNode;
}

export interface InfixExpression {
  type: "InfixExpression";
  left: ASTNode;
  operator: string;
  right: ASTNode;
}

export interface CallExpression {
  type: "CallExpression";
  function: IdentifierNode; // For simplicity, assume function is an identifier. Could be an expression in full JS.
  arguments: ASTNode[];
}

export interface ListExpression {
    type: "ListExpression";
    elements: ASTNode[];
}

export interface RangeExpression {
    type: "RangeExpression";
    start: ASTNode;
    end: ASTNode; // Desmos ranges are usually [start, ..., end] or [start, next, ..., end]
    // For this simplified demo we'll assume a binary operator `...`
}

// --- Precedence ---

enum Precedence {
  LOWEST = 0,
  RANGE = 1,     // ...
  SUM = 2,       // + -
  PRODUCT = 3,   // * /
  PREFIX = 4,    // -X
  EXPONENT = 5,  // ^
  CALL = 6,      // f(x)
}

// --- Parser ---

export class Parser {
  private tokens: Token[];
  private pos = 0;
  private errors: string[] = [];

  constructor(input: string) {
    const lexer = new Lexer(input);
    this.tokens = lexer.tokenize();
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private match(type: TokenType): boolean {
    if (this.peek().type === type) {
      this.consume();
      return true;
    }
    return false;
  }

  public parse(): ASTNode {
    try {
        const expr = this.parseExpression(Precedence.LOWEST);
        if (this.peek().type !== TokenType.EOF) {
             throw new Error("Unexpected token after expression: " + this.peek().value);
        }
        return expr;
    } catch (e: any) {
        console.error("Parse Error:", e.message);
        throw e;
    }
  }

  private parseExpression(precedence: number): ASTNode {
    let token = this.consume();
    let left = this.nud(token);

    while (precedence < this.getPrecedence(this.peek().type)) {
      token = this.consume();
      left = this.led(left, token);
    }

    return left;
  }

  // Null Denotation: Prefix handlers (literals, identifiers, unary ops)
  private nud(token: Token): ASTNode {
    switch (token.type) {
      case TokenType.Number:
        return { type: "NumberLiteral", value: parseFloat(token.value) };
      case TokenType.String:
        return { type: "StringLiteral", value: token.value };
      case TokenType.Identifier:
        return { type: "Identifier", name: token.value };
      case TokenType.Minus:
        return {
          type: "PrefixExpression",
          operator: "-",
          right: this.parseExpression(Precedence.PREFIX),
        };
      case TokenType.LParen: {
        const expr = this.parseExpression(Precedence.LOWEST);
        if (!this.match(TokenType.RParen)) {
          throw new Error("Expected ')'");
        }
        return expr;
      }
      case TokenType.LBracket:
          return this.parseListLiteral();
      default:
        throw new Error(`Unexpected token in nud: ${token.value} (${TokenType[token.type]})`);
    }
  }

  // Left Denotation: Infix/Postfix handlers
  private led(left: ASTNode, token: Token): ASTNode {
    switch (token.type) {
      case TokenType.Plus:
      case TokenType.Minus:
      case TokenType.Multiply:
      case TokenType.Divide:
      case TokenType.Power:
      case TokenType.DotDotDot: // Treat range ... as infix operator for now
        return {
          type: token.type === TokenType.DotDotDot ? "RangeExpression" : "InfixExpression",
          left,
          operator: token.value,
          right: this.parseExpression(this.getPrecedence(token.type)),
        } as any; 
      
      case TokenType.LParen: // Function Call f(x) -> left is Identifier
         if (left.type !== "Identifier") {
             throw new Error("Function call on non-identifier not supported in this demo");
         }
         return this.parseCallExpression(left as IdentifierNode);

      default:
        throw new Error(`Unexpected token in led: ${token.value}`);
    }
  }

  private getPrecedence(type: TokenType): number {
    switch (type) {
      case TokenType.DotDotDot: return Precedence.RANGE;
      case TokenType.Plus:
      case TokenType.Minus:
        return Precedence.SUM;
      case TokenType.Multiply:
      case TokenType.Divide:
        return Precedence.PRODUCT;
      case TokenType.Power:
        return Precedence.EXPONENT;
      case TokenType.LParen:
        return Precedence.CALL;
      default:
        return Precedence.LOWEST;
    }
  }

  private parseCallExpression(func: IdentifierNode): CallExpression {
      // We already consumed LParen in led
      const args: ASTNode[] = [];
      if (this.peek().type !== TokenType.RParen) {
          do {
              args.push(this.parseExpression(Precedence.LOWEST));
          } while (this.match(TokenType.Comma));
      }
      if (!this.match(TokenType.RParen)) {
          throw new Error("Expected ')' after function arguments");
      }
      return {
          type: "CallExpression",
          function: func,
          arguments: args
      };
  }

  private parseListLiteral(): ListExpression {
      // We already consumed LBracket in nud
      const elements: ASTNode[] = [];
       if (this.peek().type !== TokenType.RBracket) {
          do {
              elements.push(this.parseExpression(Precedence.LOWEST));
          } while (this.match(TokenType.Comma));
      }
      if (!this.match(TokenType.RBracket)) {
          throw new Error("Expected ']' at end of list");
      }
      return {
          type: "ListExpression",
          elements
      };
  }
}

