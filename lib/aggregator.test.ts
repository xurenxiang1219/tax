/**
 * 金额汇总器单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  aggregator,
  calculateTotal,
  calculateByCategory,
  calculateSummary,
  type Invoice,
  type CategorySummary,
} from './aggregator';

describe('金额汇总器', () => {
  describe('calculateTotal', () => {
    it('空报销事项的汇总应返回 0', () => {
      const result = calculateTotal([]);
      expect(result).toBe(0);
    });

    it('单张发票的汇总应返回该发票金额', () => {
      const invoices: Invoice[] = [
        { amount: 100.5, category: 'transportation' },
      ];
      const result = calculateTotal(invoices);
      expect(result).toBe(100.5);
    });

    it('多张发票的汇总应返回所有金额之和', () => {
      const invoices: Invoice[] = [
        { amount: 100.5, category: 'transportation' },
        { amount: 50.25, category: 'meals' },
        { amount: 200.0, category: 'accommodation' },
      ];
      const result = calculateTotal(invoices);
      expect(result).toBe(350.75);
    });

    it('应忽略金额为 null 的发票', () => {
      const invoices: Invoice[] = [
        { amount: 100.0, category: 'transportation' },
        { amount: null, category: 'meals' },
        { amount: 50.0, category: 'office' },
      ];
      const result = calculateTotal(invoices);
      expect(result).toBe(150.0);
    });

    it('应保留金额到小数点后两位', () => {
      const invoices: Invoice[] = [
        { amount: 10.123, category: 'transportation' },
        { amount: 20.456, category: 'meals' },
      ];
      const result = calculateTotal(invoices);
      // 10.123 + 20.456 = 30.579，四舍五入后为 30.58
      expect(result).toBe(30.58);
    });

    it('应正确处理小数精度问题', () => {
      const invoices: Invoice[] = [
        { amount: 0.1, category: 'transportation' },
        { amount: 0.2, category: 'meals' },
      ];
      const result = calculateTotal(invoices);
      // JavaScript 浮点数精度问题：0.1 + 0.2 = 0.30000000000000004
      // 应正确处理为 0.3
      expect(result).toBe(0.3);
    });
  });

  describe('calculateByCategory', () => {
    it('空报销事项的分类汇总应全部为 0', () => {
      const result = calculateByCategory([]);
      expect(result).toEqual({
        transportation: 0,
        meals: 0,
        accommodation: 0,
        office: 0,
        other: 0,
      });
    });

    it('单张发票的分类汇总应只在对应分类有值', () => {
      const invoices: Invoice[] = [
        { amount: 100.5, category: 'transportation' },
      ];
      const result = calculateByCategory(invoices);
      expect(result).toEqual({
        transportation: 100.5,
        meals: 0,
        accommodation: 0,
        office: 0,
        other: 0,
      });
    });

    it('多张同类别发票应正确累加', () => {
      const invoices: Invoice[] = [
        { amount: 50.0, category: 'meals' },
        { amount: 30.5, category: 'meals' },
        { amount: 20.25, category: 'meals' },
      ];
      const result = calculateByCategory(invoices);
      expect(result.meals).toBe(100.75);
    });

    it('多张不同类别发票应正确分类汇总', () => {
      const invoices: Invoice[] = [
        { amount: 100.0, category: 'transportation' },
        { amount: 50.5, category: 'meals' },
        { amount: 200.0, category: 'accommodation' },
        { amount: 30.25, category: 'office' },
        { amount: 10.0, category: 'other' },
      ];
      const result = calculateByCategory(invoices);
      expect(result).toEqual({
        transportation: 100.0,
        meals: 50.5,
        accommodation: 200.0,
        office: 30.25,
        other: 10.0,
      });
    });

    it('应忽略金额为 null 的发票', () => {
      const invoices: Invoice[] = [
        { amount: 100.0, category: 'transportation' },
        { amount: null, category: 'transportation' },
        { amount: 50.0, category: 'meals' },
      ];
      const result = calculateByCategory(invoices);
      expect(result.transportation).toBe(100.0);
      expect(result.meals).toBe(50.0);
    });

    it('应保留每个分类的金额到小数点后两位', () => {
      const invoices: Invoice[] = [
        { amount: 10.123, category: 'transportation' },
        { amount: 20.456, category: 'transportation' },
        { amount: 15.789, category: 'meals' },
      ];
      const result = calculateByCategory(invoices);
      // 10.123 + 20.456 = 30.579，四舍五入后为 30.58
      expect(result.transportation).toBe(30.58);
      // 15.789 四舍五入后为 15.79
      expect(result.meals).toBe(15.79);
    });
  });

  describe('calculateSummary', () => {
    it('应返回包含总金额和分类汇总的完整结果', () => {
      const invoices: Invoice[] = [
        { amount: 100.0, category: 'transportation' },
        { amount: 50.5, category: 'meals' },
        { amount: 200.0, category: 'accommodation' },
      ];
      const result = calculateSummary(invoices);
      
      expect(result.total).toBe(350.5);
      expect(result.byCategory).toEqual({
        transportation: 100.0,
        meals: 50.5,
        accommodation: 200.0,
        office: 0,
        other: 0,
      });
    });

    it('分类汇总之和应等于总金额', () => {
      const invoices: Invoice[] = [
        { amount: 100.0, category: 'transportation' },
        { amount: 50.5, category: 'meals' },
        { amount: 200.0, category: 'accommodation' },
        { amount: 30.25, category: 'office' },
        { amount: 10.0, category: 'other' },
      ];
      const result = calculateSummary(invoices);
      
      const categorySum = 
        result.byCategory.transportation +
        result.byCategory.meals +
        result.byCategory.accommodation +
        result.byCategory.office +
        result.byCategory.other;
      
      expect(categorySum).toBe(result.total);
    });

    it('空报销事项应返回全部为 0 的汇总', () => {
      const result = calculateSummary([]);
      
      expect(result.total).toBe(0);
      expect(result.byCategory).toEqual({
        transportation: 0,
        meals: 0,
        accommodation: 0,
        office: 0,
        other: 0,
      });
    });
  });

  describe('aggregator 实例', () => {
    it('应提供与便捷函数相同的功能', () => {
      const invoices: Invoice[] = [
        { amount: 100.0, category: 'transportation' },
        { amount: 50.0, category: 'meals' },
      ];

      expect(aggregator.calculateTotal(invoices)).toBe(calculateTotal(invoices));
      expect(aggregator.calculateByCategory(invoices)).toEqual(calculateByCategory(invoices));
      expect(aggregator.calculateSummary(invoices)).toEqual(calculateSummary(invoices));
    });
  });
});
