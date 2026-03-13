import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/prisma';
import * as fileHandler from '@/lib/file-handler';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock file-handler
vi.mock('@/lib/file-handler', () => ({
  readFile: vi.fn(),
}));

describe('GET /api/invoices/:id/preview', () => {
  // 测试数据工厂
  const createMockInvoice = (id: string, fileName: string, fileType: string) => ({
    id,
    fileName,
    fileType,
    filePath: `uploads/invoices/item-1/${id}_${fileName}`,
  });

  // 辅助函数：执行预览请求
  const executePreviewRequest = async (invoiceId: string) => {
    const request = new Request(`http://localhost:3000/api/invoices/${invoiceId}/preview`);
    return await GET(request, { params: { id: invoiceId } });
  };

  // 辅助函数：验证成功响应
  const verifySuccessResponse = async (response: Response, expectedContentType: string, expectedFileName: string, expectedBuffer: Buffer) => {
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(expectedContentType);
    expect(response.headers.get('Content-Disposition')).toContain('inline');
    expect(response.headers.get('Content-Disposition')).toContain(expectedFileName);

    const responseBuffer = await response.arrayBuffer();
    expect(Buffer.from(responseBuffer)).toEqual(expectedBuffer);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该成功返回 PDF 文件内容', async () => {
    const mockInvoice = createMockInvoice('invoice-1', 'test-invoice.pdf', 'application/pdf');
    const mockFileBuffer = Buffer.from('PDF file content');

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never);
    vi.mocked(fileHandler.readFile).mockResolvedValue(mockFileBuffer);

    const response = await executePreviewRequest('invoice-1');
    await verifySuccessResponse(response, 'application/pdf', 'test-invoice.pdf', mockFileBuffer);

    expect(prisma.invoice.findUnique).toHaveBeenCalledWith({ where: { id: 'invoice-1' } });
    expect(fileHandler.readFile).toHaveBeenCalledWith(mockInvoice.filePath);
  });

  it('应该成功返回 JPEG 图片文件内容', async () => {
    const mockInvoice = createMockInvoice('invoice-2', 'test-invoice.jpg', 'image/jpeg');
    const mockFileBuffer = Buffer.from('JPEG image content');

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never);
    vi.mocked(fileHandler.readFile).mockResolvedValue(mockFileBuffer);

    const response = await executePreviewRequest('invoice-2');
    await verifySuccessResponse(response, 'image/jpeg', 'test-invoice.jpg', mockFileBuffer);
  });

  it('应该成功返回 PNG 图片文件内容', async () => {
    const mockInvoice = createMockInvoice('invoice-3', 'test-invoice.png', 'image/png');
    const mockFileBuffer = Buffer.from('PNG image content');

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never);
    vi.mocked(fileHandler.readFile).mockResolvedValue(mockFileBuffer);

    const response = await executePreviewRequest('invoice-3');
    await verifySuccessResponse(response, 'image/png', 'test-invoice.png', mockFileBuffer);
  });

  it('应该在发票不存在时返回 404 错误', async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null);

    const response = await executePreviewRequest('non-existent');

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('NOT_FOUND');
    expect(data.error.message).toBe('发票不存在');
    expect(fileHandler.readFile).not.toHaveBeenCalled();
  });

  it('应该在文件不存在时返回 404 错误', async () => {
    const mockInvoice = createMockInvoice('invoice-4', 'missing-file.pdf', 'application/pdf');

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never);
    vi.mocked(fileHandler.readFile).mockResolvedValue(null);

    const response = await executePreviewRequest('invoice-4');

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('NOT_FOUND');
    expect(data.error.message).toBe('发票文件不存在');
  });

  it('应该在数据库错误时返回 500 错误', async () => {
    vi.mocked(prisma.invoice.findUnique).mockRejectedValue(new Error('Database connection failed'));

    const response = await executePreviewRequest('invoice-5');

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('DATABASE_ERROR');
    expect(data.error.message).toBe('预览发票失败，请稍后重试');
  });

  it('应该正确处理包含特殊字符的文件名', async () => {
    const mockInvoice = createMockInvoice('invoice-6', '测试发票 (2024).pdf', 'application/pdf');
    const mockFileBuffer = Buffer.from('PDF content');

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never);
    vi.mocked(fileHandler.readFile).mockResolvedValue(mockFileBuffer);

    const response = await executePreviewRequest('invoice-6');

    expect(response.status).toBe(200);
    const contentDisposition = response.headers.get('Content-Disposition');
    expect(contentDisposition).toContain('inline');
    expect(contentDisposition).toContain(encodeURIComponent('测试发票 (2024).pdf'));
  });

  it('应该为未知文件类型设置默认 Content-Type', async () => {
    const mockInvoice = createMockInvoice('invoice-7', 'test.unknown', 'application/unknown');
    const mockFileBuffer = Buffer.from('Unknown content');

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never);
    vi.mocked(fileHandler.readFile).mockResolvedValue(mockFileBuffer);

    const response = await executePreviewRequest('invoice-7');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/unknown');
  });
});
