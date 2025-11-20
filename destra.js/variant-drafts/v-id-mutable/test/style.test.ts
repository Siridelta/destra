
import { describe, test, expect } from 'vitest';
import { expl, expr, Expression, VarExpl } from '../src/core/index';
import { LineStyle, PointStyle } from '../src/core/formula/style';

// ============================================================================
// 测试用例 (针对新版 API)
// ============================================================================

describe('Style API Tests (New Architecture)', () => {

    test('应该能通过 .style(obj) 设置基本样式 (Deep Merge)', () => {
        const e = expl`x^2`;
        
        e.style({
            color: '#ff0000',
            hidden: true
        });

        expect(e.styleData.color).toBe('#ff0000');
        expect(e.styleData.hidden).toBe(true);
    });

    test('应该能通过 .style(callback) 进行精细编辑 (Mutation)', () => {
        const e = expl`x^2`;
        
        e.style(s => {
            // 1. 原生赋值 - 叶子节点
            s.color = 'blue';
            
            // 2. 原生赋值 - 中间节点 (Overwrite)
            s.line = { width: 2.5, style: LineStyle.DASHED };
            
            // 3. 嵌套编辑
            s.point.edit(p => {
                p.size = 15;
            });
        });

        expect(e.styleData.color).toBe('blue');
        expect(e.styleData.line?.width).toBe(2.5);
        expect(e.styleData.line?.style).toBe(LineStyle.DASHED);
        expect(e.styleData.point?.size).toBe(15);
    });

    test('应该支持不对称读写 (Asymmetric Access)', () => {
        const e = expl`sin(x)`;
        
        e.style(s => {
            // Setter 接受值
            s.line.width = 10;
            
            // Getter 返回 Editor
            const widthEditor = s.line.width;
            expect(typeof widthEditor).toBe('object');
            expect(widthEditor).toHaveProperty('set');
            expect(widthEditor).toHaveProperty('delete');
            
            // 读值必须用 .value
            expect(s.line.width.value).toBe(10);
        });
    });

    test('应该能通过快捷方式 (e.point, e.line) 修改样式', () => {
        const p = expl`(1, 1)`;
        
        // 配置对象模式
        p.point({
            size: 10,
            style: PointStyle.CROSS
        });
        expect(p.styleData.point?.size).toBe(10);

        // 回调模式
        p.point(pt => {
            pt.opacity = 0.5;
        });
        expect(p.styleData.point?.opacity).toBe(0.5);
        expect(p.styleData.point?.size).toBe(10); // 之前的设置应保留
    });

    test('Editor.update() Deep Merge 更新逻辑', () => {
        const e = expl`cos(x)`;
        
        // 初始设置
        e.style({
            point: {
                size: 5,
                opacity: 0.8
            }
        });
        
        // 局部更新 (通过 .update())
        e.style(s => {
            s.point.update({
                opacity: 1.0 // 只更新 opacity
            });
        });
        
        // 验证 merge
        expect(e.styleData.point?.size).toBe(5); // 保持不变
        expect(e.styleData.point?.opacity).toBe(1.0); // 更新
    });

    test('Editor.set() (及赋值操作符) 覆盖行为', () => {
        const e = expl`sin(x)`;
        
        // 初始设置
        e.style({
            point: {
                size: 5,
                opacity: 0.8
            },
            line: {
                width: 2.5,
                style: LineStyle.DASHED
            }
        });
        
        // 赋值操作 (通过 Setter 和 .set())
        e.style(s => {
            s.point = {
                opacity: 1.0
            };
            s.line.set({
                width: 3.0
            });
        });
        
        // 验证 Overwrite (size 丢失)
        expect(e.styleData.point?.size).toBeUndefined();
        expect(e.styleData.point?.opacity).toBe(1.0);
        expect(e.styleData.line?.width).toBe(3.0);
        expect(e.styleData.line?.style).toBeUndefined();
    });

    test('删除属性 (.delete 和 undefined)', () => {
        const e = expl`x`;
        e.style({ color: 'red', line: { width: 5 } });
        expect(e.styleData.color).toBe('red');
        
        e.style(s => {
            // 方式 1: .delete()
            s.color.delete();
            
            // 方式 2: 赋值 undefined
            s.line.width = undefined;
        });
        
        expect(e.styleData.color).toBe(undefined);
        expect(e.styleData.line?.width).toBe(undefined);
        // line 对象本身还在
        expect(e.styleData.line).not.toBeUndefined();
        
        // 删除整个对象
        e.style(s => s.line.delete());
        expect(e.styleData.line).toBe(undefined);
    });

    test('Editor 路径自动创建 (Auto-vivification)', () => {
        const e = expl`x`;
        
        e.style(s => {
            // 访问不存在的路径是安全的，返回空 Editor
            const sizeEditor = s.point.size;
            expect(sizeEditor.value).toBe(undefined);
            
            // 写入深层路径会自动创建父级对象
            s.point.size = 20;
        });
        
        expect(e.styleData.point).toEqual({ size: 20 });
    });

    test('Editor .set() 支持 Updater 函数', () => {
        const e = expl`x`;
        e.style({ point: { size: 10 } });

        e.style(s => {
            // s.point.size 是 Editor
            // s.point.size.value 是 10
            s.point.size.set((prev: any) => (prev as number) * 2);
        });

        expect(e.styleData.point?.size).toBe(20);
    });

    test('Editor .update() 显式 Merge', () => {
        const e = expl`x`;
        e.style({ point: { size: 10, opacity: 0.5 } });

        e.style(s => {
            // update 只更新提供的字段
            s.point.update({ opacity: 1.0 });
        });

        expect(e.styleData.point?.size).toBe(10);
        expect(e.styleData.point?.opacity).toBe(1.0);
    });

    test('Editor .set() 显式覆盖 (Overwrite) 对象节点', () => {
        const e = expl`x`;
        e.style({ point: { size: 10, opacity: 0.5 } });

        e.style(s => {
            // .set() 应该覆盖整个 point 对象，丢失 size
            s.point.set({ opacity: 1.0 });
        });

        expect(e.styleData.point?.size).toBeUndefined();
        expect(e.styleData.point?.opacity).toBe(1.0);
    });

    test('.setStyle() 完全覆盖 (Overwrite)', () => {
        const e = expl`x`;
        e.style({ color: 'red', point: { size: 10 } });

        e.setStyle({ color: 'blue' });

        expect(e.styleData.color).toBe('blue');
        expect(e.styleData.point).toBeUndefined(); // 之前的 point 应该被清除
    });

    test('一级属性 Setters (setPoint, setLine...) 完全覆盖', () => {
        const e = expl`x`;
        e.style({ point: { size: 10, opacity: 0.5 } });

        // 使用 setPoint 覆盖 point
        e.setPoint({ size: 20 });

        expect(e.styleData.point?.size).toBe(20);
        expect(e.styleData.point?.opacity).toBeUndefined(); // opacity 应该被清除
    });

    test('应该支持 Expression 和 VarExpl 作为样式值', () => {
        const e = expl`x^2`;
        
        // 1. 创建用于样式的变量和表达式
        const C = expl`C` as VarExpl; // Color variable
        const w = expl`w` as VarExpl; // Width variable
        const widthExpr = expl`${w} * 2` as VarExpl;
        
        e.style({
            color: C,
            line: {
                width: widthExpr,
                opacity: expr`0.5 + ${w}/10` as Expression
            }
        });

        // 验证存储的是引用
        expect(e.styleData.color).toBe(C);
        expect(e.styleData.line?.width).toBe(widthExpr);
        
        // 验证 VarExpl 作为 Expression 的一部分也能被正确存储
        // (opacity 是一个新的 Expression 实例)
        const opacity = e.styleData.line?.opacity;
        expect(opacity).toBeInstanceOf(Expression);
    });

    test('Editor 应该能处理 Expression 和 VarExpl 类型的读写', () => {
        const e = expr`y = x^2`;
        const C1 = expl`C_1` as VarExpl;
        const C2 = expl`C_2` as VarExpl;
        
        e.style({ color: C1 });
        
        e.style(s => {
            // 读取
            expect(s.color.value).toBe(C1);
            
            // 写入
            s.color = C2;
        });
        
        expect(e.styleData.color).toBe(C2);
    });

});
