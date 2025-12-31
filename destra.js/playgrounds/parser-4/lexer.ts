export enum TokenType {
  Number,
  String,
  Identifier,
  Plus,
  Minus,
  Multiply,
  Divide,
  Power,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Comma,
  DotDotDot, // ...
  EOF,
}

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

export class Lexer {
  private pos = 0;
  private input: string;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      // Whitespace
      if (/\s/.test(char)) {
        this.pos++;
        continue;
      }

      // Numbers
      if (/[0-9]/.test(char)) {
        let value = "";
        const start = this.pos;
        let hasDot = false;
        
        while (this.pos < this.input.length) {
            const c = this.input[this.pos];
            if (/[0-9]/.test(c)) {
                value += c;
                this.pos++;
            } else if (c === '.') {
                // Check if it's the start of ...
                if (this.input.startsWith("...", this.pos)) {
                    break;
                }
                if (hasDot) {
                    break; // Second dot
                }
                hasDot = true;
                value += c;
                this.pos++;
            } else {
                break;
            }
        }
        tokens.push({ type: TokenType.Number, value, start, end: this.pos });
        continue;
      }

      // Identifiers
      if (/[a-zA-Z_]/.test(char)) {
        let value = "";
        const start = this.pos;
        while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
          value += this.input[this.pos];
          this.pos++;
        }
        tokens.push({ type: TokenType.Identifier, value, start, end: this.pos });
        continue;
      }

      // Strings
      if (char === "'" || char === '"') {
        const quote = char;
        this.pos++; // skip quote
        let value = "";
        const start = this.pos;
        while (this.pos < this.input.length && this.input[this.pos] !== quote) {
          value += this.input[this.pos];
          this.pos++;
        }
        this.pos++; // skip closing quote
        tokens.push({ type: TokenType.String, value, start, end: this.pos });
        continue;
      }

      // Operators and Punctuation
      const start = this.pos;
      if (this.input.startsWith("...", this.pos)) {
        tokens.push({ type: TokenType.DotDotDot, value: "...", start, end: this.pos + 3 });
        this.pos += 3;
        continue;
      }

      switch (char) {
        case "+": tokens.push({ type: TokenType.Plus, value: "+", start, end: ++this.pos }); break;
        case "-": tokens.push({ type: TokenType.Minus, value: "-", start, end: ++this.pos }); break;
        case "*": tokens.push({ type: TokenType.Multiply, value: "*", start, end: ++this.pos }); break;
        case "/": tokens.push({ type: TokenType.Divide, value: "/", start, end: ++this.pos }); break;
        case "^": tokens.push({ type: TokenType.Power, value: "^", start, end: ++this.pos }); break;
        case "(": tokens.push({ type: TokenType.LParen, value: "(", start, end: ++this.pos }); break;
        case ")": tokens.push({ type: TokenType.RParen, value: ")", start, end: ++this.pos }); break;
        case "[": tokens.push({ type: TokenType.LBracket, value: "[", start, end: ++this.pos }); break;
        case "]": tokens.push({ type: TokenType.RBracket, value: "]", start, end: ++this.pos }); break;
        case ",": tokens.push({ type: TokenType.Comma, value: ",", start, end: ++this.pos }); break;
        default:
          throw new Error(`Unexpected character: ${char} at ${this.pos}`);
      }
    }
    tokens.push({ type: TokenType.EOF, value: "", start: this.pos, end: this.pos });
    return tokens;
  }
}

