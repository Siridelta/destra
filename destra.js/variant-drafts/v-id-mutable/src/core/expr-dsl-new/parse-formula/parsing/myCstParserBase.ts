import { CstParser, TokenType } from "chevrotain";

export class MyCstParserBase extends CstParser {
    constructor(tokens: TokenType[]) {
        super(tokens);
    }

    public nullable_OR(...args: Parameters<typeof this.OR>): void {
        this.OPTION(() => {
            this.OR(...args);
        });
    }


}