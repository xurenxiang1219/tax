import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DELETE } from './route';
import { prisma } from '@/lib/prisma';
import * as fileHandler from '@/lib/file-handler';
import { vi } from 'vitest';

describe.sequential('DELETE /api/items/:id', () => {
  let testItemId: string;

  beforeEach(async () => {
    // 清理旧数据
    await prisma.invoice.deleteMany({});
    await prisma.reimbursementItem.deleteMany({});
    
    // 创建测试报销事项
    const item = await prisma.reimbursementItem.create({
      data: {
        title: '测试报销事项',
        notes: '用于删除测试',
      },
    });
    testItemId = item.id;

    // Mock 文件删除函数
    vi.spyOn(fileHandler, 'deleteItemFiles').mockResolvedValue({ success: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('应该成功删除存在的报销事项', async () => {
    const request = new Request('http://localhost:3000/api/items/' + testItemId, {
      method: 'DELETE',
    });

    const response = await DELETE(request as any, { params: { id: testItemId } });

    expect(response.status).toBe(204);

    // 验证数据库中的记录已删除
    const deletedItem = await prisma.reimbursementItem.findUnique({
      where: { id: testItemId },
    });
    expect(deletedItem).toBeNull();

    // 验证调用了文件删除函数
    expect(fileHandler.deleteItemFiles).toHaveBeenCalledWith(testItemId);
  });

  it('应该返回 404 当报销事项不存在时', async () => {
    const nonExistentId = 'nonexistent-id';
    const request = new Request('http://localhost:3000/api/items/' + nonExistentId, {
      method: 'DELETE',
    });

    const response = await DELETE(request as any, { params: { id: nonExistentId } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error.code).toBe('NOT_FOUND');
    expect(data.error.message).toBe('报销事项不存在');
  });

  it('应该级联删除关联的发票记录', async () => {
    // 创建关联的发票
    const invoice = await prisma.invoice.create({
      data: {
        fileName: 'test.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        filePath: 'uploads/invoices/test/test.pdf',
        reimbursementItemId: testItemId,
      },
    });

    const request = new Request('http://localhost:3000/api/items/' + testItemId, {
      method: 'DELETE',
    });

    const response = await DELETE(request as any, { params: { id: testItemId } });

    expect(response.status).toBe(204);

    // 验证发票记录也被删除
    const deletedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
    });
    expect(deletedInvoice).toBeNull();
  });

  it('即使文件删除失败也应该返回成功', async () => {
    // Mock 文件删除失败
    vi.spyOn(fileHandler, 'deleteItemFiles').mockResolvedValue({
      success: false,
      error: '文件删除失败',
    });

    const request = new Request('http://localhost:3000/api/items/' + testItemId, {
      method: 'DELETE',
    });

    const response = await DELETE(request as any, { params: { id: testItemId } });

    // 即使文件删除失败，也应该返回 204（数据库记录已删除）
    expect(response.status).toBe(204);

    // 验证数据库记录已删除
    const deletedItem = await prisma.reimbursementItem.findUnique({
      where: { id: testItemId },
    });
    expect(deletedItem).toBeNull();
  });
});
