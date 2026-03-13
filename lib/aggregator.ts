/**
 * 金额汇总器
 * 计算报销事项的总金额和按分类汇总的金额
 */

import { InvoiceCategory } from './classifier';

/**
 * 发票接口（用于金额汇总）
 */
export interface Invoice {
  amount: number | null;
  category: InvoiceCategory;
}

/**
 * 分类汇总结果
 */
export interface CategorySummary {
  transportation: number;
  meals: number;
  accommodation: number;
  office: number;
  other: number;
}

/**
 * 金额汇总结果
 */
export interface AmountSummary {
  total: number;
  byCategory: CategorySummary;
}

/**
 * 金额汇总器接口
 */
export interface AmountAggregator {
  calculateTotal(invoices: Invoice[]): number;
  calculateByCategory(invoices: Invoice[]): CategorySummary;
  calculateSummary(invoices: Invoice[]): AmountSummary;
}

/**
 * 金额汇总器实现
 */
class AmountAggregatorImpl implements AmountAggregator {
  /**
   * 计算总金额
   * 验证需求: 5.1, 5.5
   * 
   * @param invoices - 发票列表
   * @returns 总金额（保留两位小数）
   */
  calculateTotal(invoices: Invoice[]): number {
    if (!invoices || invoices.length === 0) {
      return 0;
    }

    const total = invoices.reduce((sum, invoice) => {
      // 只计算有效金额（非 null 且为数字）
      const amount = invoice.amount ?? 0;
      return sum + amount;
    }, 0);

    // 保留两位小数
    return this.roundToTwoDecimals(total);
  }

  /**
   * 按分类计算金额汇总
   * 验证需求: 5.2
   * 
   * @param invoices - 发票列表
   * @returns 各分类的金额小计（保留两位小数）
   */
  calculateByCategory(invoices: Invoice[]): CategorySummary {
    const summary: CategorySummary = {
      transportation: 0,
      meals: 0,
      accommodation: 0,
      office: 0,
      other: 0,
    };

    if (!invoices || invoices.length === 0) {
      return summary;
    }

    // 按分类累加金额
    for (const invoice of invoices) {
      const amount = invoice.amount ?? 0;
      const category = invoice.category;

      if (category in summary) {
        summary[category] += amount;
      }
    }

    // 保留两位小数（遍历所有分类统一处理）
    for (const key of Object.keys(summary) as Array<keyof CategorySummary>) {
      summary[key] = this.roundToTwoDecimals(summary[key]);
    }

    return summary;
  }

  /**
   * 计算完整的金额汇总（包括总金额和分类汇总）
   * 
   * @param invoices - 发票列表
   * @returns 完整的金额汇总结果
   */
  calculateSummary(invoices: Invoice[]): AmountSummary {
    return {
      total: this.calculateTotal(invoices),
      byCategory: this.calculateByCategory(invoices),
    };
  }

  /**
   * 将数字保留两位小数
   * 使用四舍五入
   * 
   * @param value - 原始数值
   * @returns 保留两位小数的数值
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

/**
 * 导出汇总器单例实例
 */
export const aggregator = new AmountAggregatorImpl();

/**
 * 便捷函数：计算总金额
 * @param invoices - 发票列表
 * @returns 总金额（保留两位小数）
 */
export function calculateTotal(invoices: Invoice[]): number {
  return aggregator.calculateTotal(invoices);
}

/**
 * 便捷函数：按分类计算金额汇总
 * @param invoices - 发票列表
 * @returns 各分类的金额小计（保留两位小数）
 */
export function calculateByCategory(invoices: Invoice[]): CategorySummary {
  return aggregator.calculateByCategory(invoices);
}

/**
 * 便捷函数：计算完整的金额汇总
 * @param invoices - 发票列表
 * @returns 完整的金额汇总结果
 */
export function calculateSummary(invoices: Invoice[]): AmountSummary {
  return aggregator.calculateSummary(invoices);
}
