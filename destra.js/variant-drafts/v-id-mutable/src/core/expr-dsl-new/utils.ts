import { type TemplatePayload } from "../formula/base";

/**
 * 构建可检查的源代码字符串
 * 将模板载荷转换为一个字符串，其中插值部分用 `${index}` 占位符替换
 */
export const buildInspectableSource = (payload: TemplatePayload): string => {
    const { strings, values } = payload;
    let source = strings[0]!;
    for (let index = 0; index < values.length; index += 1) {
        source += `\${${index}}`;
        source += strings[index + 1]!;
    }
    return source.trim();
};

