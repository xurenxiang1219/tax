import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { PUT } from './route';

describe.sequential('PUT /api/items/:id - 更新报销事项', () => {
  beforeEach(async () => {
    // 清理旧数据
    await prisma.invoice.deleteMany();
    await prisma.reimbursementItem.deleteMany();
  });

  afterEach(async () => {
    // 测试后清理
    await prisma.invoice.deleteMany();
    await prisma.reimbursementItem.deleteMany();
  });

  it('应该成功更新标题', async () => {
    const item = await prisma.reimbursementItem.create({
      data: { title: '原标题' },
    });

    const request = new Request('http://localhost/api/items/' + item.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新标题' }),
    });

    const response = await PUT(request, { params: { id: item.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('新标题');
  });

  it('应该成功更新备注', async () => {
    const item = await prisma.reimbursementItem.create({
      data: { title: '测试' },
    });

    const request = new Request('http://localhost/api/items/' + item.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: '新备注' }),
    });

    const response = await PUT(request, { params: { id: item.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.notes).toBe('新备注');
  });

  it('应该返回 404 错误（报销事项不存在）', async () => {
    const request = new Request('http://localhost/api/items/nonexistent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新标题' }),
    });

    const response = await PUT(request, { params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });
});
