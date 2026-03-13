/**
 * 去重检测器测试
 */

import { describe, it, expect } from 'vitest';
import { detector, checkDuplicate, type Invoice } from './detector';

describe('去重检测器', () => {
  // 测试数据
  const mockInvoices: Invoice[] = [
    {
      id: '1',
      fileName: 'invoice1.pdf',
      fileSize: 1024,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      fileName: 'receipt.jpg',
      fileSize: 2048,
      createdAt: new Date('2024-01-02'),
    },
    {
      id: '3',
      fileName: 'ticket.png',
      fileSize: 1024,
      createdAt: new Date('2024-01-03'),
    },
  ];

  describe('单元测试', () => {
    it('应该检测到文件名和文件大小完全相同的重复（高置信度）', () => {
      const result = detector.checkDuplicate('invoice1.pdf', 1024, mockInvoices);

      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.matchedInvoice).toBeDefined();
      expect(result.matchedInvoice?.id).toBe('1');
    });

    it('应该检测到文件名相同但大小不同的情况（中等置信度）', () => {
      const result = detector.checkDuplicate('invoice1.pdf', 2048, mockInvoices);

      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBe(0.6);
      expect(result.matchedInvoice).toBeDefined();
      expect(result.matchedInvoice?.id).toBe('1');
    });

    it('应该检测到文件名不同但大小相同的情况（低置信度，不视为重复）', () => {
      const result = detector.checkDuplicate('new-file.pdf', 1024, mockInvoices);

      expect(result.isDuplicate).toBe(false);
      expect(result.confidence).toBe(0.3);
      expect(result.matchedInvoice).toBeUndefined();
    });

    it('应该处理完全不同的文件（无重复）', () => {
      const result = detector.checkDuplicate('unique.pdf', 9999, mockInvoices);

      expect(result.isDuplicate).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.matchedInvoice).toBeUndefined();
    });

    it('应该处理空发票列表', () => {
      const result = detector.checkDuplicate('test.pdf', 1024, []);

      expect(result.isDuplicate).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.matchedInvoice).toBeUndefined();
    });

    it('应该忽略文件名大小写差异', () => {
      const result = detector.checkDuplicate('INVOICE1.PDF', 1024, mockInvoices);

      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.matchedInvoice?.id).toBe('1');
    });

    it('应该处理文件名前后有空格的情况', () => {
      const result = detector.checkDuplicate('  invoice1.pdf  ', 1024, mockInvoices);

      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.matchedInvoice?.id).toBe('1');
    });

    it('应该处理无效输入（空文件名）', () => {
      const result = detector.checkDuplicate('', 1024, mockInvoices);

      expect(result.isDuplicate).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('应该处理无效输入（零文件大小）', () => {
      const result = detector.checkDuplicate('test.pdf', 0, mockInvoices);

      expect(result.isDuplicate).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('应该处理无效输入（负文件大小）', () => {
      const result = detector.checkDuplicate('test.pdf', -100, mockInvoices);

      expect(result.isDuplicate).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('应该选择置信度最高的匹配项', () => {
      const invoices: Invoice[] = [
        {
          id: '1',
          fileName: 'test.pdf',
          fileSize: 1024,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          fileName: 'other.pdf',
          fileSize: 2048,
          createdAt: new Date('2024-01-02'),
        },
      ];

      // 文件名和大小都匹配第一个发票
      const result = detector.checkDuplicate('test.pdf', 1024, invoices);

      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.matchedInvoice?.id).toBe('1');
    });
  });

  describe('便捷函数', () => {
    it('checkDuplicate 函数应该正常工作', () => {
      const result = checkDuplicate('invoice1.pdf', 1024, mockInvoices);

      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBe(1.0);
    });
  });
});
