import { describe, test, expect } from 'vitest';
import { expr, expl, type Expression, type VarExpl, type FuncExpl, type Substitutable } from "../src/core/index";
import { getState as _getState } from '../src/core/state';

const getState = _getState;

describe('Internal Context Clause', () => {

    // ============================================================================
    // 1. sum
    // ============================================================================
    describe('sum', () => {
        test('should create a Sum expression', () => {
            const result = expr`sum(n = 1, 10) n^2`;
        });
    });

    // ============================================================================
    // 2. int
    // ============================================================================
    describe('int', () => {
        test('should create an Int expression, dx at the end', () => {
            const result = expr`int(0, 1) x^2 dx`;
        });
        test('should create an Int expression, dx at the beginning', () => {
            const result = expr`int(0, 1) dx x^2 + 1`;
            const ast = getState(result).ast!.ast;
        });
        
    });
});
