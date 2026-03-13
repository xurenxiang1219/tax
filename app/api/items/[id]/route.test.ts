import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/prisma';

describe.sequential('GET /api/items/:id - 查询报销事项详情', () => {
  // 每个测试后清理数据
  afterEach(async () => {
    await prisma.invoice.deleteMany({});
    await prisma.reimbursementItem.deleteMany({});
  });

  it('应该返回报销事项的详细信息', async () => {
    const item = await prisma.reimbursementItem.create({
      data: {
        title: '测试报销事项',
        notes: '这是测试备注',
      },
    });

    const request = new Request(`http://localhost:3000/api/items/${item.id}`);
    const response = await GET(request as any, { params: { id: item.id } as any });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      id: item.id,
      title: '测试报销事项',
      notes: '这是测试备注',
    });
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('updatedAt');
    expect(data).toHaveProperty('invoices');
    expect(data).toHaveProperty('summary');
  });

  it('应该返回所有关联的发票信息', async () => {
    const item = await prisma.reimbursementItem.create({
      data: { title: '测试报销事项' },
    });

    const invoice1 = await prisma.invoice.create({
      data: {
        reimbursementItemId: item.id,
        fileName: 'invoice1.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        filePath: '/uploads/invoice1.pdf',
        amount: 100.50,
        category: 'transportation',
        ocrStatus: 'success',
        ocrText: '发票内容1',
      },
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const invoice2 = await prisma.invoice.create({
      data: {
        reimbursementItemId: item.id,
        fileName: 'invoice2.jpg',
        fileSize: 2048,
        fileType: 'image/jpeg',
        filePath: '/uploads/invoice2.jpg',
        amount: 200.75,
        category: 'meals',
        ocrStatus: 'success',
      },
    });

    const request = new Request(`http://localhost:3000/api/items/${item.id}`);
    const response = await GET(request as any, { params: { id: item.id } as any });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.invoices).toHaveLength(2);
    
    // 验证发票按创建时间倒序排列（最新的在前）
    expect(data.invoices[0].id).toBe(invoice2.id);
    expect(data.invoices[1].id).toBe(invoice1.id);
    
    // 验证发票信息完整性
    expect(data.invoices[0]).toMatchObject({
      id: invoice2.id,
      fileName: 'invoice2.jpg',
      fileSize: 2048,
      fileType: 'image/jpeg',
      filePath: '/uploads/invoice2.jpg',
      amount: 200.75,
      category: 'meals',
      ocrStatus: 'success',
      ocrText: null,
    });
    expect(data.invoices[0]).toHaveProperty('createdAt');
    expect(data.invoices[0]).toHaveProperty('updatedAt');
  });

  it('应该返回金额汇总信息', async () => {
    const item = await prisma.reimbursementItem.create({
      data: { title: '测试报销事项' },
    });

    await prisma.invoice.createMany({
      data: [
        {
          reimbursementItemId: item.id,
          fileName: 'invoice1.pdf',
          fileSize: 1024,
          fileType: 'application/pdf',
          filePath: '/uploads/invoice1.pdf',
          amount: 100.50,
          category: 'transportation',
        },
        {
          reimbursementItemId: item.id,
          fileName: 'invoice2.pdf',
          fileSize: 2048,
          fileType: 'application/pdf',
          filePath: '/uploads/invoice2.pdf',
          amount: 200.75,
          category: 'meals',
        },
        {
          reimbursementItemId: item.id,
          fileName: 'invoice3.pdf',
          fileSize: 3072,
          fileType: 'application/pdf',
          filePath: '/uploads/invoice3.pdf',
          amount: 50.25,
          category: 'transportation',
        },
      ],
    });

    const request = new Request(`http://localhost:3000/api/items/${item.id}`);
    const response = await GET(request as any, { params: { id: item.id } as any });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary).toMatchObject({
      total: 351.5,
      byCategory: {
        transportation: 150.75,
        meals: 200.75,
        accommodation: 0,
        office: 0,
        other: 0,
      },
    });
  });

  it('应该正确处理没有发票的报销事项', async () => {
    const item = await prisma.reimbursementItem.create({
      data: { title: '空报销事项' },
    });

    const request = new Request(`http://localhost:3000/api/items/${item.id}`);
    const response = await GET(request as any, { params: { id: item.id } as any });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.invoices).toEqual([]);
    expect(data.summary).toMatchObject({
      total: 0,
      byCategory: {
        transportation: 0,
        meals: 0,
        accommodation: 0,
        office: 0,
        other: 0,
      },
    });
  });

  it('应该正确处理包含 null 金额的发票', async () => {
    const item = await prisma.reimbursementItem.create({
      data: { title: '测试报销事项' },
    });

    await prisma.invoice.createMany({
      data: [
        {
          reimbursementItemId: item.id,
          fileName: 'invoice1.pdf',
          fileSize: 1024,
          fileType: 'application/pdf',
          filePath: '/uploads/invoice1.pdf',
          amount: 100.00,
          category: 'transportation',
        },
        {
          reimbursementItemId: item.id,
          fileName: 'invoice2.pdf',
          fileSize: 2048,
          fileType: 'application/pdf',
          filePath: '/uploads/invoice2.pdf',
          amount: null,
          category: 'other',
        },
      ],
    });

    const request = new Request(`http://localhost:3000/api/items/${item.id}`);
    const response = await GET(request as any, { params: { id: item.id } as any });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.invoices).toHaveLength(2);
    expect(data.summary.total).toBe(100.00);
  });

  it('应该返回 404 错误（报销事项不存在）', async () => {
    const nonExistentId = 'non-existent-id';
    
    const request = new Request(`http://localhost:3000/api/items/${nonExistentId}`);
    const response = await GET(request as any, { params: { id: nonExistentId } as any });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toMatchObject({
      code: 'NOT_FOUND',
      message: '报销事项不存在',
    });
    expect(data.error).toHaveProperty('timestamp');
  });

  it('应该保留金额到小数点后两位', async () => {
    const item = await prisma.reimbursementItem.create({
      data: { title: '小数精度测试' },
    });

    await prisma.invoice.createMany({
      data: [
        {
          reimbursementItemId: item.id,
          fileName: 'invoice1.pdf',
          fileSize: 1024,
          fileType: 'application/pdf',
          filePath: '/uploads/invoice1.pdf',
          amount: 0.1,
          category: 'transportation',
        },
        {
          reimbursementItemId: item.id,
          fileName: 'invoice2.pdf',
          fileSize: 2048,
          fileType: 'application/pdf',
          filePath: '/uploads/invoice2.pdf',
          amount: 0.2,
          category: 'transportation',
        },
      ],
    });

    const request = new Request(`http://localhost:3000/api/items/${item.id}`);
    const response = await GET(request as any, { params: { id: item.id } as any });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.total).toBe(0.3);
    expect(data.summary.byCategory.transportation).toBe(0.3);
    
    const totalDecimals = data.summary.total.toString().split('.')[1]?.length || 0;
    expect(totalDecimals).toBeLessThanOrEqual(2);
  });

  it('应该返回完整的发票字段信息', async () => {
    const item = await prisma.reimbursementItem.create({
      data: { title: '完整字段测试' },
    });

    const invoice = await prisma.invoice.create({
      data: {
        reimbursementItemId: item.id,
        fileName: 'test-invoice.pdf',
        fileSize: 5120,
        fileType: 'application/pdf',
        filePath: '/uploads/test-invoice.pdf',
        amount: 123.45,
        category: 'meals',
        ocrStatus: 'success',
        ocrText: '这是 OCR 识别的文本内容',
      },
    });

    const request = new Request(`http://localhost:3000/api/items/${item.id}`);
    const response = await GET(request as any, { params: { id: item.id } as any });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.invoices).toHaveLength(1);
    expect(data.invoices[0]).toEqual({
      id: invoice.id,
      fileName: 'test-invoice.pdf',
      fileSize: 5120,
      fileType: 'application/pdf',
      filePath: '/uploads/test-invoice.pdf',
      amount: 123.45,
      category: 'meals',
      ocrStatus: 'success',
      ocrText: '这是 OCR 识别的文本内容',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });
});
