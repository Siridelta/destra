
import { describe, test, expect } from 'vitest';
import { expl } from '../src/core/index';
import { LineStyle, PointStyle } from '../src/core/formula/style';

// ============================================================================
// 测试用例 (Migrated to Vitest)
// ============================================================================

describe('Style API Tests', () => {

    test('应该能通过 .style(obj) 设置基本样式', () => {
        const e = expl`x^2`;
        
        e.style({
            color: '#ff0000',
            hidden: true
        });

        expect(e.styleData.color).toBe('#ff0000');
        expect(e.styleData.hidden).toBe(true);
    });

    test('应该能通过 .style(callback) 进行链式编辑', () => {
        const e = expl`x^2`; // y=x 是方程，expl 不支持，改用表达式
        
        // 使用显式 Getter 提供的链式能力
        e.style(s => 
            s.color('blue')
             .line.width(2.5)
             .style(LineStyle.DASHED)
        );

        expect(e.styleData.color).toBe('blue');
        expect(e.styleData.line?.width).toBe(2.5);
        expect(e.styleData.line?.style).toBe(LineStyle.DASHED);
    });

    test('应该能通过快捷方式 (e.point, e.line) 修改样式', () => {
        const p = expl`(1, 1)`;
        
        p.point({
            size: 10,
            style: PointStyle.CROSS
        });

        expect(p.styleData.point?.size).toBe(10);
        expect(p.styleData.point?.style).toBe(PointStyle.CROSS);
    });

    test('Explicit Getters 应该存在 (用于 Console/IDE 支持)', () => {
        const e = expl`sin(x)`;
        
        // 测试 .style 本身是函数
        expect(typeof e.style).toBe('function');
        
        // 测试显式挂载的属性存在
        // 注意：我们使用的是 Schema 生成的属性
        expect(e.style).toHaveProperty('color');
        expect(e.style).toHaveProperty('point');
        expect(e.style).toHaveProperty('line');
        
        // 测试子级属性
        expect(e.style.line).toHaveProperty('width');
    });

    test('Deep Merge 更新逻辑', () => {
        const e = expl`cos(x)`;
        
        // 初始设置
        e.style({
            point: {
                size: 5,
                opacity: 0.8
            }
        });
        
        // 局部更新
        e.style({
            point: {
                opacity: 1.0 // 只更新 opacity
            }
        });
        
        // 验证 merge
        expect(e.styleData.point?.size).toBe(5); // 保持不变
        expect(e.styleData.point?.opacity).toBe(1.0); // 更新
    });

    test('Editor.toJSON() 应该返回当前层级的数据', () => {
        const e = expl`x`;
        e.style({ color: 'green', line: { width: 10 } });
        
        // 根级别 toJSON
        expect(e.style.toJSON()).toEqual(e.styleData);
        
        // 子级别 toJSON
        expect(e.style.line.toJSON()).toEqual({ width: 10 });
    });
    
    test('删除属性 (.delete)', () => {
        const e = expl`x`;
        e.style({ color: 'red' });
        expect(e.styleData.color).toBe('red');
        
        e.style(s => s.color.delete());
        
        expect(e.styleData.color).toBe(undefined);
    });

});
