import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DELETE } from './route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import * as fileHandler from '@/lib/file-handler';

// Mock 文件处理器
vi.mock('@/lib/file-handler', async () => {
  const actual = await vi.importActual('@/lib/file-handler');
  return {
    ...actual,
    deleteFile: vi.fn(),
  };
});

describe('DELETE /api/invoices/:id - 删除发票', () => {
  let testItemId: string;
  let testInvoiceId: string;

  beforeEach(async () => {
    // 重置 mock
    vi.clearAllMocks();
    
    // 默认 mock deleteFile 返回成功
    vi.mocked(fileHandler.deleteFile).mockResolvedValue({ success: true });

    // 创建测试报销事项
    const item = await prisma.reimbursementItem.create({
      data: {
        title: '测试报销事项',
      },
    });
    testItemId = item.id;

    // 创建测试发票
    const invoice = await prisma.invoice.create({
      data: {
        fileName: 'test-invoice.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        filePath: '/uploads/invoices/test/test-invoice.pdf',
        amount: 100.50,
        category: 'transportation',
        ocrStatus: 'success',
        reimbursementItemId: testItemId,
      },
    });
    testInvoiceId = invoice.id;
  });

  afterEach(async () => {
    // 清理测试数据
    await prisma.invoice.deleteMany({
      where: { reimbursementItemId: testItemId },
    });
    await prisma.reimbursementItem.deleteMany({
      where: { id: testItemId },
    });
  });

  it('应该成功删除发票', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'DELETE',
    });
    
    const response = await DELETE(request, { params: { id: testInvoiceId } });
    
    // 应该返回 204 No Content
    expect(response.status).toBe(204);
    
    // 验证数据库记录已删除
    const deletedInvoice = await prisma.invoice.findUnique({
      where: { id: testInvoiceId },
    });
    expect(deletedInvoice).toBeNull();
    
    // 验证调用了文件删除函数
    expect(fileHandler.deleteFile).toHaveBeenCalledWith('/uploads/invoices/test/test-invoice.pdf');
  });

  it('应该返回 404 错误当发票不存在时', async () => {
    const nonExistentId = 'non-existent-id';
    const request = new NextRequest('http://localhost:3000/api/invoices/' + nonExistentId, {
      method: 'DELETE',
    });
    
    const response = await DELETE(request, { params: { id: nonExistentId } });
    
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error.code).toBe('NOT_FOUND');
    expect(data.error.message).toBe('发票不存在');
    
    // 不应该调用文件删除函数
    expect(fileHandler.deleteFile).not.toHaveBeenCalled();
  });

  it('应该保留报销事项记录', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'DELETE',
    });
    
    await DELETE(request, { params: { id: testInvoiceId } });
    
    // 验证报销事项仍然存在
    const item = await prisma.reimbursementItem.findUnique({
      where: { id: testItemId },
    });
    expect(item).not.toBeNull();
    expect(item?.id).toBe(testItemId);
  });

  it('删除最后一张发票后应该保留报销事项', async () => {
    // 这是唯一的发票，删除后报销事项应该保留
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'DELETE',
    });
    
    await DELETE(request, { params: { id: testInvoiceId } });
    
    // 验证报销事项仍然存在
    const item = await prisma.reimbursementItem.findUnique({
      where: { id: testItemId },
      include: {
        invoices: true,
      },
    });
    
    expect(item).not.toBeNull();
    expect(item?.invoices).toHaveLength(0); // 无剩余发票
  });

  it('即使文件删除失败也应该返回成功', async () => {
    // Mock 文件删除失败
    vi.mocked(fileHandler.deleteFile).mockResolvedValue({
      success: false,
      error: '文件删除失败: 权限不足',
    });

    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'DELETE',
    });
    
    const response = await DELETE(request, { params: { id: testInvoiceId } });
    
    // 即使文件删除失败，也应该返回 204（数据库记录已删除）
    expect(response.status).toBe(204);
    
    // 验证数据库记录已删除
    const deletedInvoice = await prisma.invoice.findUnique({
      where: { id: testInvoiceId },
    });
    expect(deletedInvoice).toBeNull();
  });

  it('应该删除数据库记录和文件', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'DELETE',
    });
    
    await DELETE(request, { params: { id: testInvoiceId } });
    
    // 验证数据库记录已删除
    const deletedInvoice = await prisma.invoice.findUnique({
      where: { id: testInvoiceId },
    });
    expect(deletedInvoice).toBeNull();
    
    // 验证文件删除函数被调用
    expect(fileHandler.deleteFile).toHaveBeenCalledTimes(1);
    expect(fileHandler.deleteFile).toHaveBeenCalledWith('/uploads/invoices/test/test-invoice.pdf');
  });

  it('删除多张发票中的一张时应该保留其他发票', async () => {
    // 创建第二张发票
    const invoice2 = await prisma.invoice.create({
      data: {
        fileName: 'test-invoice-2.pdf',
        fileSize: 2048,
        fileType: 'application/pdf',
        filePath: '/uploads/invoices/test/test-invoice-2.pdf',
        amount: 200.00,
        category: 'meals',
        ocrStatus: 'success',
        reimbursementItemId: testItemId,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'DELETE',
    });
    
    await DELETE(request, { params: { id: testInvoiceId } });
    
    // 验证第一张发票已删除
    const deletedInvoice = await prisma.invoice.findUnique({
      where: { id: testInvoiceId },
    });
    expect(deletedInvoice).toBeNull();
    
    // 验证第二张发票仍然存在
    const remainingInvoice = await prisma.invoice.findUnique({
      where: { id: invoice2.id },
    });
    expect(remainingInvoice).not.toBeNull();
    expect(remainingInvoice?.id).toBe(invoice2.id);
  });
});
