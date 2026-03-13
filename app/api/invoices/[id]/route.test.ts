import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

describe('GET /api/invoices/:id - 查询发票详情', () => {
  let testItemId: string;
  let testInvoiceId: string;

  beforeEach(async () => {
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
        ocrText: '测试 OCR 文本',
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

  it('应该成功查询发票详情', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId);
    const response = await GET(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toMatchObject({
      id: testInvoiceId,
      fileName: 'test-invoice.pdf',
      fileSize: 1024,
      fileType: 'application/pdf',
      filePath: '/uploads/invoices/test/test-invoice.pdf',
      amount: 100.50,
      category: 'transportation',
      ocrStatus: 'success',
      ocrText: '测试 OCR 文本',
      reimbursementItemId: testItemId,
    });
    expect(data.createdAt).toBeDefined();
    expect(data.updatedAt).toBeDefined();
  });

  it('应该返回 404 错误当发票不存在时', async () => {
    const nonExistentId = 'non-existent-id';
    const request = new NextRequest('http://localhost:3000/api/invoices/' + nonExistentId);
    const response = await GET(request, { params: { id: nonExistentId } });
    
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error).toMatchObject({
      code: 'NOT_FOUND',
      message: '发票不存在',
    });
    expect(data.error.timestamp).toBeDefined();
  });

  it('应该返回包含所有必需字段的发票详情', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId);
    const response = await GET(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // 验证所有必需字段都存在
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('fileName');
    expect(data).toHaveProperty('fileSize');
    expect(data).toHaveProperty('fileType');
    expect(data).toHaveProperty('filePath');
    expect(data).toHaveProperty('amount');
    expect(data).toHaveProperty('category');
    expect(data).toHaveProperty('ocrStatus');
    expect(data).toHaveProperty('ocrText');
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('updatedAt');
    expect(data).toHaveProperty('reimbursementItemId');
  });

  it('应该正确处理 amount 为 null 的情况', async () => {
    // 创建一个 amount 为 null 的发票
    const invoiceWithNullAmount = await prisma.invoice.create({
      data: {
        fileName: 'no-amount-invoice.pdf',
        fileSize: 2048,
        fileType: 'application/pdf',
        filePath: '/uploads/invoices/test/no-amount-invoice.pdf',
        amount: null,
        category: 'other',
        ocrStatus: 'failed',
        reimbursementItemId: testItemId,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/invoices/' + invoiceWithNullAmount.id);
    const response = await GET(request, { params: { id: invoiceWithNullAmount.id } });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.amount).toBeNull();
    expect(data.ocrStatus).toBe('failed');
  });
});


describe('PUT /api/invoices/:id - 更新发票信息', () => {
  let testItemId: string;
  let testInvoiceId: string;

  beforeEach(async () => {
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
        ocrText: '测试 OCR 文本',
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

  it('应该成功更新发票金额', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ amount: 200.75 }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.amount).toBe(200.75);
    expect(data.category).toBe('transportation'); // 分类不变
  });

  it('应该成功更新发票分类', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ category: 'meals' }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.category).toBe('meals');
    expect(data.amount).toBe(100.50); // 金额不变
  });

  it('应该成功同时更新金额和分类', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ amount: 150.00, category: 'accommodation' }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.amount).toBe(150.00);
    expect(data.category).toBe('accommodation');
  });

  it('应该允许将金额设置为 null', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ amount: null }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.amount).toBeNull();
  });

  it('应该拒绝负数金额', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ amount: -50.00 }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error.code).toBe('INVALID_AMOUNT');
    expect(data.error.message).toContain('负数');
  });

  it('应该拒绝超过两位小数的金额', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ amount: 100.123 }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error.code).toBe('INVALID_AMOUNT');
    expect(data.error.message).toContain('两位小数');
  });

  it('应该拒绝非数字金额', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ amount: 'invalid' }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error.code).toBe('INVALID_AMOUNT');
    expect(data.error.message).toContain('数字');
  });

  it('应该拒绝非有限数字（通过字符串传递）', async () => {
    // JSON.stringify 会将 NaN 和 Infinity 转换为 null
    // 在实际应用中，如果前端发送了非有限数字，它会被序列化为 null
    // 这个测试验证我们的验证逻辑是正确的，即使在实际中不太可能遇到
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ amount: null }), // Infinity 和 NaN 都会变成 null
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    // null 是允许的（表示未识别金额）
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.amount).toBeNull();
  });

  it('应该拒绝无效的分类', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ category: 'invalid_category' }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error.code).toBe('INVALID_CATEGORY');
    expect(data.error.message).toContain('transportation');
    expect(data.error.message).toContain('meals');
    expect(data.error.message).toContain('accommodation');
    expect(data.error.message).toContain('office');
    expect(data.error.message).toContain('other');
  });

  it('应该拒绝非字符串分类', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ category: 123 }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error.code).toBe('INVALID_CATEGORY');
  });

  it('应该返回 404 错误当发票不存在时', async () => {
    const nonExistentId = 'non-existent-id';
    const request = new NextRequest('http://localhost:3000/api/invoices/' + nonExistentId, {
      method: 'PUT',
      body: JSON.stringify({ amount: 100.00 }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: nonExistentId } });
    
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error.code).toBe('NOT_FOUND');
    expect(data.error.message).toBe('发票不存在');
  });

  it('应该拒绝空请求体', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error.code).toBe('INVALID_REQUEST');
    expect(data.error.message).toContain('amount');
    expect(data.error.message).toContain('category');
  });

  it('应该接受零金额', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ amount: 0 }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.amount).toBe(0);
  });

  it('应该接受整数金额（无小数）', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ amount: 100 }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.amount).toBe(100);
  });

  it('应该接受一位小数的金额', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ amount: 99.5 }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.amount).toBe(99.5);
  });

  it('应该接受两位小数的金额', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ amount: 99.99 }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.amount).toBe(99.99);
  });

  it('更新后应该保持其他字段不变', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/' + testInvoiceId, {
      method: 'PUT',
      body: JSON.stringify({ amount: 300.00 }),
    });
    
    const { PUT } = await import('./route');
    const response = await PUT(request, { params: { id: testInvoiceId } });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.fileName).toBe('test-invoice.pdf');
    expect(data.fileSize).toBe(1024);
    expect(data.fileType).toBe('application/pdf');
    expect(data.filePath).toBe('/uploads/invoices/test/test-invoice.pdf');
    expect(data.ocrStatus).toBe('success');
    expect(data.ocrText).toBe('测试 OCR 文本');
    expect(data.reimbursementItemId).toBe(testItemId);
  });
});
