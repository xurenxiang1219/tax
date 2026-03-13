import { describe, it, expect, afterEach } from 'vitest';
import { GET, POST } from './route';
import { prisma } from '@/lib/prisma';

describe.sequential('GET /api/items - 查询报销事项列表', () => {
  // 清理测试数据
  afterEach(async () => {
    await prisma.invoice.deleteMany({});
    await prisma.reimbursementItem.deleteMany({});
  });

  it('应该返回空列表（无报销事项）', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toEqual([]);
  });

  it('应该返回按创建时间倒序排列的报销事项列表', async () => {
    // 创建多个报销事项
    const item1 = await prisma.reimbursementItem.create({
      data: { title: '第一个报销事项' },
    });

    // 等待一小段时间确保时间戳不同
    await new Promise(resolve => setTimeout(resolve, 10));

    const item2 = await prisma.reimbursementItem.create({
      data: { title: '第二个报销事项' },
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const item3 = await prisma.reimbursementItem.create({
      data: { title: '第三个报销事项' },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(3);
    
    // 验证倒序排列（最新的在前）
    expect(data.items[0].id).toBe(item3.id);
    expect(data.items[1].id).toBe(item2.id);
    expect(data.items[2].id).toBe(item1.id);
  });

  it('应该包含发票数量和总金额', async () => {
    // 创建报销事项
    const item = await prisma.reimbursementItem.create({
      data: { title: '测试报销事项' },
    });

    // 添加发票
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
          amount: null, // 未识别金额的发票
          category: 'other',
        },
      ],
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].invoiceCount).toBe(3);
    expect(data.items[0].totalAmount).toBe(301.25); // 100.50 + 200.75
  });

  it('应该正确处理没有发票的报销事项', async () => {
    // 创建没有发票的报销事项
    await prisma.reimbursementItem.create({
      data: { title: '空报销事项' },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].invoiceCount).toBe(0);
    expect(data.items[0].totalAmount).toBe(0);
  });

  it('应该保留金额到小数点后两位', async () => {
    // 创建报销事项
    const item = await prisma.reimbursementItem.create({
      data: { title: '小数精度测试' },
    });

    // 添加发票（金额会产生浮点数精度问题）
    await prisma.invoice.createMany({
      data: [
        {
          reimbursementItemId: item.id,
          fileName: 'invoice1.pdf',
          fileSize: 1024,
          fileType: 'application/pdf',
          filePath: '/uploads/invoice1.pdf',
          amount: 0.1,
        },
        {
          reimbursementItemId: item.id,
          fileName: 'invoice2.pdf',
          fileSize: 2048,
          fileType: 'application/pdf',
          filePath: '/uploads/invoice2.pdf',
          amount: 0.2,
        },
      ],
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items[0].totalAmount).toBe(0.3);
    
    // 验证小数位数
    const decimalPlaces = data.items[0].totalAmount.toString().split('.')[1]?.length || 0;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });

  it('应该返回完整的报销事项信息', async () => {
    const item = await prisma.reimbursementItem.create({
      data: {
        title: '完整信息测试',
        notes: '这是备注',
      },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({
      id: item.id,
      title: '完整信息测试',
      notes: '这是备注',
      invoiceCount: 0,
      totalAmount: 0,
    });
    expect(data.items[0]).toHaveProperty('createdAt');
    expect(data.items[0]).toHaveProperty('updatedAt');
  });
});

describe.sequential('POST /api/items - 创建报销事项', () => {
  // 清理测试数据
  afterEach(async () => {
    await prisma.reimbursementItem.deleteMany({});
  });

  it('应该成功创建报销事项（包含标题和备注）', async () => {
    const request = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '测试报销事项',
        notes: '这是测试备注',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id');
    expect(data.title).toBe('测试报销事项');
    expect(data.notes).toBe('这是测试备注');
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('updatedAt');

    // 验证数据库中确实创建了记录
    const item = await prisma.reimbursementItem.findUnique({
      where: { id: data.id },
    });
    expect(item).not.toBeNull();
    expect(item?.title).toBe('测试报销事项');
  });

  it('应该成功创建报销事项（仅标题）', async () => {
    const request = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '仅标题的报销事项',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe('仅标题的报销事项');
    expect(data.notes).toBeNull();
  });

  it('应该成功创建报销事项（使用默认标题）', async () => {
    const request = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe('未命名报销事项');
    expect(data.notes).toBeNull();
  });

  it('应该成功创建报销事项（空字符串标题使用默认值）', async () => {
    const request = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe('未命名报销事项');
  });

  it('应该返回包含时间戳的响应', async () => {
    const request = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '时间戳测试',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    
    // 验证时间戳格式
    const createdAt = new Date(data.createdAt);
    const updatedAt = new Date(data.updatedAt);
    
    expect(createdAt.toISOString()).toBe(data.createdAt);
    expect(updatedAt.toISOString()).toBe(data.updatedAt);
    expect(createdAt.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
