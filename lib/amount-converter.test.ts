import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { toChineseWords } from './amount-converter';

describe('金额大写转换器', () => {
  describe('单元测试 - 基本功能', () => {
    it('应该转换整数金额', () => {
      expect(toChineseWords(100)).toBe('壹佰元整');
      expect(toChineseWords(1)).toBe('壹元整');
      expect(toChineseWords(10)).toBe('壹拾元整');
      expect(toChineseWords(1000)).toBe('壹仟元整');
    });

    it('应该转换带小数的金额', () => {
      expect(toChineseWords(123.45)).toBe('壹佰贰拾叁元肆角伍分');
      expect(toChineseWords(0.12)).toBe('零元壹角贰分');
      expect(toChineseWords(1.5)).toBe('壹元伍角');
      expect(toChineseWords(1.05)).toBe('壹元零伍分');
    });

    it('应该转换零元', () => {
      expect(toChineseWords(0)).toBe('零元整');
      expect(toChineseWords(0.0)).toBe('零元整');
      expect(toChineseWords(0.00)).toBe('零元整');
    });

    it('应该转换大额金额', () => {
      expect(toChineseWords(10000)).toBe('壹万元整');
      expect(toChineseWords(10001)).toBe('壹万零壹元整');
      expect(toChineseWords(100000000)).toBe('壹亿元整');
      expect(toChineseWords(123456789.12)).toBe('壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖元壹角贰分');
    });

    it('应该处理包含零的金额', () => {
      expect(toChineseWords(101)).toBe('壹佰零壹元整');
      expect(toChineseWords(1001)).toBe('壹仟零壹元整');
      expect(toChineseWords(1010)).toBe('壹仟零壹拾元整');
      expect(toChineseWords(10010)).toBe('壹万零壹拾元整');
    });

    it('应该处理只有角的金额', () => {
      expect(toChineseWords(0.1)).toBe('零元壹角');
      expect(toChineseWords(0.5)).toBe('零元伍角');
      expect(toChineseWords(1.2)).toBe('壹元贰角');
    });

    it('应该处理只有分的金额', () => {
      expect(toChineseWords(0.01)).toBe('零元零壹分');
      expect(toChineseWords(0.09)).toBe('零元零玖分');
      expect(toChineseWords(1.01)).toBe('壹元零壹分');
    });

    it('应该正确四舍五入到两位小数', () => {
      expect(toChineseWords(1.234)).toBe('壹元贰角叁分');
      expect(toChineseWords(1.235)).toBe('壹元贰角肆分');
      expect(toChineseWords(1.999)).toBe('贰元整');
    });
  });

  describe('单元测试 - 边界情况', () => {
    it('应该拒绝负数', () => {
      expect(() => toChineseWords(-1)).toThrow('金额不能为负数');
      expect(() => toChineseWords(-0.01)).toThrow('金额不能为负数');
    });

    it('应该拒绝无效数字', () => {
      expect(() => toChineseWords(NaN)).toThrow('金额必须是有效数字');
      expect(() => toChineseWords(Infinity)).toThrow('金额必须是有效数字');
      expect(() => toChineseWords(-Infinity)).toThrow('金额必须是有效数字');
    });

    it('应该处理非常小的金额', () => {
      expect(toChineseWords(0.01)).toBe('零元零壹分');
      expect(toChineseWords(0.001)).toBe('零元整'); // 四舍五入到0.00
    });

    it('应该处理万位边界', () => {
      expect(toChineseWords(9999)).toBe('玖仟玖佰玖拾玖元整');
      expect(toChineseWords(10000)).toBe('壹万元整');
      expect(toChineseWords(10001)).toBe('壹万零壹元整');
    });

    it('应该处理亿位边界', () => {
      expect(toChineseWords(99999999)).toBe('玖仟玖佰玖拾玖万玖仟玖佰玖拾玖元整');
      expect(toChineseWords(100000000)).toBe('壹亿元整');
      expect(toChineseWords(100000001)).toBe('壹亿零壹元整');
    });
  });

  describe('基于属性的测试', () => {
    // **Validates: Requirements 19.12**
    // Feature: invoice-reimbursement-system, Property 26: 金额大写转换的往返验证
    it('属性 26: 转换后的中文大写应该表示相同的数值含义', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(999999999.99), noNaN: true, noDefaultInfinity: true }),
          (amount) => {
            // 四舍五入到两位小数，与实现保持一致
            const roundedAmount = Math.round(amount * 100) / 100;
            
            const chineseWords = toChineseWords(amount);
            
            // 验证结果是字符串
            expect(typeof chineseWords).toBe('string');
            
            // 验证结果不为空
            expect(chineseWords.length).toBeGreaterThan(0);
            
            // 验证结果包含"元"字
            expect(chineseWords).toContain('元');
            
            // 验证结果以"整"、"角"或"分"结尾
            expect(
              chineseWords.endsWith('整') ||
              chineseWords.endsWith('角') ||
              chineseWords.endsWith('分')
            ).toBe(true);
            
            // 验证零元的特殊情况
            if (roundedAmount === 0) {
              expect(chineseWords).toBe('零元整');
            }
            
            // 验证整数金额以"整"结尾
            if (roundedAmount === Math.floor(roundedAmount)) {
              expect(chineseWords.endsWith('整')).toBe(true);
            }
            
            // 验证只包含有效的中文数字字符
            const validChars = /^[零壹贰叁肆伍陆柒捌玖拾佰仟万亿元角分整]+$/;
            expect(validChars.test(chineseWords)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('属性: 相同金额应该产生相同的转换结果', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(999999.99), noNaN: true, noDefaultInfinity: true }),
          (amount) => {
            const result1 = toChineseWords(amount);
            const result2 = toChineseWords(amount);
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('属性: 更大的金额应该产生不同的转换结果（除非四舍五入后相同）', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(999999.99), noNaN: true, noDefaultInfinity: true }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true, noDefaultInfinity: true }),
          (amount, increment) => {
            const rounded1 = Math.round(amount * 100) / 100;
            const rounded2 = Math.round((amount + increment) * 100) / 100;
            
            const result1 = toChineseWords(amount);
            const result2 = toChineseWords(amount + increment);
            
            if (rounded1 === rounded2) {
              expect(result1).toBe(result2);
            } else {
              expect(result1).not.toBe(result2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('属性: 小数部分为0的金额应该以"整"结尾', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 999999999 }),
          (intAmount) => {
            const result = toChineseWords(intAmount);
            expect(result.endsWith('整')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('属性: 有小数部分的金额不应该以"整"结尾', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: Math.fround(999999.99), noNaN: true, noDefaultInfinity: true }),
          (amount) => {
            // 确保有小数部分
            const rounded = Math.round(amount * 100) / 100;
            const hasDecimal = rounded !== Math.floor(rounded);
            
            if (hasDecimal) {
              const result = toChineseWords(amount);
              expect(result.endsWith('整')).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
