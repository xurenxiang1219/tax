import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InvoiceCategory } from '@/lib/classifier';
import { deleteFile } from '@/lib/file-handler';
import { successResponse, noContentResponse, ApiError } from '@/lib/api-response';

async function resolveParams(params: Promise<{ id: string }> | { id: string }) {
  return 'then' in params ? await params : params;
}

/**
 * GET /api/invoices/:id - 查询发票详情
 * 
 * 验证需求: 7.2
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await resolveParams(context.params);

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) return ApiError.notFound('发票不存在');

    return successResponse({
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
    });
  } catch (error) {
    console.error('查询发票详情失败:', error);
    return ApiError.databaseError(
      '查询发票详情失败，请稍后重试',
      error instanceof Error ? error.message : '未知错误'
    );
  }
}

/**
 * 验证金额格式（非负数，最多两位小数）
 */
function validateAmount(amount: unknown): { valid: boolean; error?: string } {
  if (amount === null || amount === undefined) return { valid: true };
  if (typeof amount !== 'number') return { valid: false, error: '金额必须是数字' };
  if (!Number.isFinite(amount)) return { valid: false, error: '金额必须是有效的数字' };
  if (amount < 0) return { valid: false, error: '金额不能为负数' };

  const decimalPart = amount.toString().split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
    return { valid: false, error: '金额最多保留两位小数' };
  }

  return { valid: true };
}

/**
 * 验证分类有效性
 */
function validateCategory(category: unknown): { valid: boolean; error?: string } {
  const validCategories: InvoiceCategory[] = ['transportation', 'meals', 'accommodation', 'office', 'other'];
  
  if (typeof category !== 'string') {
    return { valid: false, error: '分类必须是字符串' };
  }

  if (!validCategories.includes(category as InvoiceCategory)) {
    return { valid: false, error: `分类必须是以下之一: ${validCategories.join(', ')}` };
  }

  return { valid: true };
}

/**
 * PUT /api/invoices/:id - 更新发票信息
 * 
 * 验证需求: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await resolveParams(context.params);
    const body = await request.json();
    const { amount, category } = body;

    if (amount === undefined && category === undefined) {
      return ApiError.custom('INVALID_REQUEST', '请提供要更新的字段（amount 或 category）', 400);
    }

    if (amount !== undefined) {
      const amountValidation = validateAmount(amount);
      if (!amountValidation.valid) {
        return ApiError.custom('INVALID_AMOUNT', amountValidation.error || '金额格式无效', 400);
      }
    }

    if (category !== undefined) {
      const categoryValidation = validateCategory(category);
      if (!categoryValidation.valid) {
        return ApiError.custom('INVALID_CATEGORY', categoryValidation.error || '分类无效', 400);
      }
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) return ApiError.notFound('发票不存在');

    const updateData: { amount?: number | null; category?: string } = {};
    if (amount !== undefined) updateData.amount = amount;
    if (category !== undefined) updateData.category = category;

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    return successResponse({
      id: updatedInvoice.id,
      fileName: updatedInvoice.fileName,
      fileSize: updatedInvoice.fileSize,
      fileType: updatedInvoice.fileType,
      filePath: updatedInvoice.filePath,
      amount: updatedInvoice.amount,
      category: updatedInvoice.category,
      ocrStatus: updatedInvoice.ocrStatus,
      ocrText: updatedInvoice.ocrText,
      createdAt: updatedInvoice.createdAt.toISOString(),
      updatedAt: updatedInvoice.updatedAt.toISOString(),
      reimbursementItemId: updatedInvoice.reimbursementItemId,
    });
  } catch (error) {
    console.error('更新发票信息失败:', error);
    return ApiError.databaseError(
      '更新发票信息失败，请稍后重试',
      error instanceof Error ? error.message : '未知错误'
    );
  }
}

/**
 * DELETE /api/invoices/:id - 删除发票
 * 
 * 验证需求: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await resolveParams(context.params);

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) return ApiError.notFound('发票不存在');

    await prisma.invoice.delete({
      where: { id },
    });

    const fileDeleteResult = await deleteFile(invoice.filePath);
    if (!fileDeleteResult.success) {
      console.error('删除发票文件失败:', fileDeleteResult.error);
    }

    return noContentResponse();
  } catch (error) {
    console.error('删除发票失败:', error);
    return ApiError.databaseError(
      '删除发票失败，请稍后重试',
      error instanceof Error ? error.message : '未知错误'
    );
  }
}
