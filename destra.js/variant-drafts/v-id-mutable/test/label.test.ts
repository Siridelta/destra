import { describe, test, expect } from 'vitest';
import { expl, label, type VarExpl } from '../src/core/index';

// ============================================================================
// Label 功能测试
// ============================================================================

describe('Label API Tests', () => {

    test('Label 应该能正确创建基本文本', () => {
        // 纯文本标签
        const l = label`Hello World`;
        
        expect(l.constructor.name).toBe('Label');
        expect(l.compiled).toBe('Hello World');
    });

    test('Label 应该能捕获插值变量', () => {
        const _x = expl`10`.id("_x") as VarExpl;
        const _y = expl`20`.id("_y") as VarExpl;

        const l = label`Position: (${_x}, ${_y})`;

        // 验证捕获了正确的值
        expect(l.values).toHaveLength(2);
        expect(l.values[0]).toBe(_x);
        expect(l.values[1]).toBe(_y);
        
        // 验证模板部分
        expect(l.template[0]).toBe('Position: (');
        expect(l.template[1]).toBe(', ');
        expect(l.template[2]).toBe(')');
    });

    test('Label 的编译输出目前应为占位符 (Pending State)', () => {
        const _x = expl`10`.id("_x") as VarExpl;
        
        const l = label`Value: ${_x}`;

        // 目前实现返回占位符，因为还没有接入编译系统
        expect(l.compiled).toBe('Value: ${<pending>}');
    });

    // 跳过原来的编译测试，因为现在逻辑已变更为占位符
    test.skip('Label 应该能正确编译带 ID/Realname 的 VarExpl 插值 (暂未实现)', () => {
        const x = expl`10`.id("x") as VarExpl;
        const alpha = expl`1`.realname("alpha") as VarExpl;

        const l1 = label`Pos: ${x}`;
        const l2 = label`Val: ${alpha}`;

        expect(l1.compiled).toBe('Pos: ${x}');
        expect(l2.compiled).toBe('Val: ${alpha}');
    });

    test('Label 应该能作为 Formula 的样式属性被设置', () => {
        const P = expl`(0,0)`.id("P") as VarExpl;
        const _x = expl`10`.id("_x") as VarExpl;
        
        const myLabel = label`X: ${_x}`;

        // 1. 通过 style 配置对象设置
        P.style({
            label: {
                text: myLabel,
                size: 24
            }
        });

        expect(P.styleData.label?.text).toBe(myLabel);
        expect(P.styleData.label?.size).toBe(24);

        // 2. 通过 style 编辑器修改
        const newLabel = label`New X: ${_x}`;
        P.style(s => {
            s.label.text = newLabel;
        });

        expect(P.styleData.label?.text).toBe(newLabel);
    });

    test('Label 对象在样式合并中应该被整体替换 (视为叶子节点)', () => {
        const e = expl`(0,0)` as VarExpl;
        const label1 = label`A`;
        const label2 = label`B`;

        e.style({ label: { text: label1 } });
        expect(e.styleData.label?.text).toBe(label1);

        e.style({ label: { text: label2 } });
        expect(e.styleData.label?.text).toBe(label2);
    });

});
