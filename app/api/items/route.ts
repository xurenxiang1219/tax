import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, ApiError } from '@/lib/api-response';

/**
 * GET /api/items - 查询报销事项列表
 * 
 * 返回所有报销事项，包含发票数量和总金额汇总
 * 验证需求: 7.1, 7.5
 */
export async function GET() {
  try {
    const items = await prisma.reimbursementItem.findMany({
      orderBy: { createdAt: 'desc' },
      include: { invoices: { select: { amount: true } } },
    });

    const itemsWithSummary = items.map((item) => ({
      id: item.id,
      title: item.title,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      invoiceCount: item.invoices.length,
      totalAmount: Number(
        item.invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0).toFixed(2)
      ),
    }));

    return successResponse({ items: itemsWithSummary });
  } catch (error) {
    console.error('查询报销事项列表失败:', error);
    return ApiError.databaseError(
      '查询报销事项列表失败，请稍后重试',
      error instanceof Error ? error.message : '未知错误'
    );
  }
}

/**
 * POST /api/items - 创建报销事项
 * 
 * 接收标题和备注，创建新的报销事项
 * 验证需求: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export async function POST(request: NextRequest) {
  try {
    const { title, notes } = await request.json();

    const item = await prisma.reimbursementItem.create({
      data: {
        title: title || undefined,
        notes: notes || null,
      },
    });

    return successResponse(
      {
        id: item.id,
        title: item.title,
        notes: item.notes,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
      201
    );
  } catch (error) {
    console.error('创建报销事项失败:', error);
    return ApiError.databaseError(
      '创建报销事项失败，请稍后重试',
      error instanceof Error ? error.message : '未知错误'
    );
  }
}
