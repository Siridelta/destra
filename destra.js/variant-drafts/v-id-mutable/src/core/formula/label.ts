import { getState } from "../state";
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