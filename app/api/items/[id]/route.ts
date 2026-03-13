import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateSummary } from '@/lib/aggregator';
import { deleteItemFiles } from '@/lib/file-handler';
import { successResponse, noContentResponse, ApiError } from '@/lib/api-response';
import { z } from 'zod';

const updateItemSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题不能超过100个字符').optional(),
  notes: z.string().max(500, '备注不能超过500个字符').nullable().optional(),
});

async function resolveParams(params: Promise<{ id: string }> | { id: string }) {
  return 'then' in params ? await params : params;
}

/**
 * GET /api/items/:id - 查询报销事项详情
 * 
 * 返回报销事项的完整信息，包括所有关联发票和金额汇总
 * 验证需求: 7.2, 7.3, 7.4
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await resolveParams(context.params);

    const item = await prisma.reimbursementItem.findUnique({
      where: { id },
      include: { invoices: { orderBy: { createdAt: 'desc' } } },
    });

    if (!item) return ApiError.notFound('报销事项不存在');

    // 计算金额汇总
    const summary = calculateSummary(
      item.invoices.map(inv => ({ amount: inv.amount, category: inv.category as any }))
    );

    // 格式化发票列表
    const invoices = item.invoices.map((invoice) => ({
      id: invoice.id,
      fileName: invoice.fileName,
      fileSize: invoice.fileSize,
      fileType: invoice.fileType,
      filePath: invoice.filePath,
      amount: invoice.amount,
      category: invoice.category,
      ocrStatus: invoice.ocrStatus,
      ocrText: invoice.ocrText,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      reimbursementItemId: invoice.reimbursementItemId,
    }));

    return successResponse({
      id: item.id,
      title: item.title,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      invoices,
      summary,
    });
  } catch (error) {
    console.error('查询报销事项详情失败:', error);
    return ApiError.databaseError(
      '查询报销事项详情失败，请稍后重试',
      error instanceof Error ? error.message : '未知错误'
    );
  }
}

/**
 * PUT /api/items/:id - 更新报销事项
 * 
 * 支持更新标题和备注，使用 Zod 进行数据验证
 * 验证需求: 16.1, 16.2, 16.3, 16.5
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await resolveParams(context.params);
    const body = await request.json();

    // 验证请求数据
    const validationResult = updateItemSchema.safeParse(body);
    if (!validationResult.success) {
      return ApiError.validationError('请求数据验证失败', validationResult.error.issues);
    }

    const { title, notes } = validationResult.data;

    // 检查报销事项是否存在
    const existingItem = await prisma.reimbursementItem.findUnique({ where: { id } });
    if (!existingItem) return ApiError.notFound('报销事项不存在');

    // 构建更新数据（只更新提供的字段）
    const updateData: { title?: string; notes?: string | null } = {};
    if (title !== undefined) updateData.title = title;
    if (notes !== undefined) updateData.notes = notes;

    const updatedItem = await prisma.reimbursementItem.update({
      where: { id },
      data: updateData,
    });

    return successResponse({
      id: updatedItem.id,
      title: updatedItem.title,
      notes: updatedItem.notes,
      createdAt: updatedItem.createdAt.toISOString(),
      updatedAt: updatedItem.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('更新报销事项失败:', error);
    return ApiError.databaseError(
      '更新报销事项失败，请稍后重试',
      error instanceof Error ? error.message : '未知错误'
    );
  }
}

/**
 * DELETE /api/items/:id - 删除报销事项
 * 
 * 删除报销事项及其所有关联的发票记录和文件
 * 验证需求: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await resolveParams(context.params);

    // 检查报销事项是否存在
    const existingItem = await prisma.reimbursementItem.findUnique({ where: { id } });
    if (!existingItem) return ApiError.notFound('报销事项不存在');

    // 删除数据库记录（级联删除关联的发票记录）
    await prisma.reimbursementItem.delete({ where: { id } });

    // 删除文件系统中的发票文件
    const fileDeleteResult = await deleteItemFiles(id);
    if (!fileDeleteResult.success) {
      console.error('删除发票文件失败:', fileDeleteResult.error);
    }

    return noContentResponse();
  } catch (error) {
    console.error('删除报销事项失败:', error);
    return ApiError.databaseError(
      '删除报销事项失败，请稍后重试',
      error instanceof Error ? error.message : '未知错误'
    );
  }
}