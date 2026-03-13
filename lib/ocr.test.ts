import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recognizeFile, recognizeImage, recognizePDF } from './ocr';

// Mock Tesseract
vi.mock('tesseract.js', () => ({
  default: {
    recognize: vi.fn(),
  },
}));

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
  version: '5.5.207',
}));

describe('OCR 工具函数', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recognizeImage', () => {
    it('应该成功识别包含金额的图片', async () => {
      const Tesseract = await import('tesseract.js');
      const mockRecognize = Tesseract.default.recognize as any;
      
      mockRecognize.mockResolvedValue({
        data: {
          text: '发票\n金额：123.45元\n日期：2024-01-01',
        },
      });

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = await recognizeImage(file);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(123.45);
      expect(result.text).toContain('金额：123.45元');
    });

    it('应该处理识别超时', async () => {
      const Tesseract = await import('tesseract.js');
      const mockRecognize = Tesseract.default.recognize as any;
      
      mockRecognize.mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 100000))
      );

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = await recognizeImage(file, 100);

      expect(result.success).toBe(false);
      expect(result.error).toContain('超时');
    });

    it('应该处理识别失败', async () => {
      const Tesseract = await import('tesseract.js');
      const mockRecognize = Tesseract.default.recognize as any;
      
      mockRecognize.mockRejectedValue(new Error('识别引擎错误'));

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = await recognizeImage(file);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('应该识别不同格式的金额', async () => {
      const Tesseract = await import('tesseract.js');
      const mockRecognize = Tesseract.default.recognize as any;
      
      const testCases = [
        { text: '¥123.45', expected: 123.45 },
        { text: '￥456.78', expected: 456.78 },
        { text: '789.12元', expected: 789.12 },
        { text: '合计：999.99', expected: 999.99 },
        { text: '总计：111.11', expected: 111.11 },
      ];

      for (const testCase of testCases) {
        mockRecognize.mockResolvedValue({
          data: { text: testCase.text },
        });

        const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const result = await recognizeImage(file);

        expect(result.success).toBe(true);
        expect(result.amount).toBe(testCase.expected);
      }
    });

    it('应该在无法提取金额时返回 null', async () => {
      const Tesseract = await import('tesseract.js');
      const mockRecognize = Tesseract.default.recognize as any;
      
      mockRecognize.mockResolvedValue({
        data: { text: '这是一段没有金额的文本' },
      });

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = await recognizeImage(file);

      expect(result.success).toBe(true);
      expect(result.amount).toBeUndefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe('recognizeFile', () => {
    it('应该根据文件类型调用正确的识别函数', async () => {
      const Tesseract = await import('tesseract.js');
      const mockRecognize = Tesseract.default.recognize as any;
      
      mockRecognize.mockResolvedValue({
        data: { text: '金额：100.00' },
      });

      // 测试 JPEG
      const jpegFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const jpegResult = await recognizeFile(jpegFile);
      expect(jpegResult.success).toBe(true);

      // 测试 PNG
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      const pngResult = await recognizeFile(pngFile);
      expect(pngResult.success).toBe(true);
    });

    it('应该拒绝不支持的文件类型', async () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      const result = await recognizeFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的文件类型');
    });
  });

  describe('金额提取逻辑', () => {
    it('应该提取带货币符号的金额', async () => {
      const Tesseract = await import('tesseract.js');
      const mockRecognize = Tesseract.default.recognize as any;
      
      const testCases = [
        '¥123.45',
        '￥123.45',
        '人民币¥123.45',
      ];

      for (const text of testCases) {
        mockRecognize.mockResolvedValue({
          data: { text },
        });

        const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const result = await recognizeImage(file);

        expect(result.amount).toBe(123.45);
      }
    });

    it('应该提取带单位的金额', async () => {
      const Tesseract = await import('tesseract.js');
      const mockRecognize = Tesseract.default.recognize as any;
      
      mockRecognize.mockResolvedValue({
        data: { text: '应付金额：456.78元' },
      });

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = await recognizeImage(file);

      expect(result.amount).toBe(456.78);
    });

    it('应该提取带标签的金额', async () => {
      const Tesseract = await import('tesseract.js');
      const mockRecognize = Tesseract.default.recognize as any;
      
      const labels = ['金额', '合计', '总计', '小计', '应付', '实付'];

      for (const label of labels) {
        mockRecognize.mockResolvedValue({
          data: { text: `${label}：789.12` },
        });

        const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const result = await recognizeImage(file);

        expect(result.amount).toBe(789.12);
      }
    });

    it('应该忽略无效的金额', async () => {
      const Tesseract = await import('tesseract.js');
      const mockRecognize = Tesseract.default.recognize as any;
      
      const invalidCases = [
        '金额：-100',  // 负数
        '金额：abc',   // 非数字
        '金额：0',     // 零
      ];

      for (const text of invalidCases) {
        mockRecognize.mockResolvedValue({
          data: { text },
        });

        const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const result = await recognizeImage(file);

        expect(result.amount).toBeUndefined();
      }
    });

    it('应该保留两位小数', async () => {
      const Tesseract = await import('tesseract.js');
      const mockRecognize = Tesseract.default.recognize as any;
      
      mockRecognize.mockResolvedValue({
        data: { text: '金额：123.456789' },
      });

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = await recognizeImage(file);

      expect(result.amount).toBe(123.46);
    });
  });
});
