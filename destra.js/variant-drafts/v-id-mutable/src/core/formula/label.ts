import { VarExpl } from "./base";

/**
 * Label 类：专门用于承载标签文本模板
 * 它可以捕获 VarExpl 引用，并在编译时将其替换为 Desmos 的插值语法
 */
export class Label {
    public readonly template: TemplateStringsArray;
    public readonly values: readonly VarExpl[];

    constructor(template: TemplateStringsArray, values: readonly VarExpl[]) {
        this.template = template;
        this.values = values;
    }

    /**
     * 获取编译后的标签文本
     * 将 VarExpl 替换为 ${realname} 格式
     */
    get compiled(): string {
        const { template, values } = this;
        let source = template[0]!;
        for (let i = 0; i < values.length; i += 1) {
            const val = values[i];
            
            // Placeholder Logic for now.
            // TODO: Should read `compiledName` from state, or trigger compilation if not ready.
            // const name = getState(val).compiledName;
            
            const name = undefined; // 模拟未编译状态

            if (!name) {
                // 占位符，表示变量尚未编译，无法确定最终变量名
                source += `\${<pending>}`;
            } else {
                source += `\${${name}}`;
            }
            source += template[i + 1]!;
        }
        return source;
    }
}

/**
 * label 模板标签工厂
 * 
 * 使用方式：
 * const l = label`Position: ${x}, ${y}`;
 */
export const label = (strings: TemplateStringsArray, ...values: VarExpl[]): Label => {
    return new Label(strings, values);
};
