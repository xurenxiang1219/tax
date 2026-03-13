import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePaymentVoucher } from '@/lib/voucher';
import { successResponse, ApiError } from '@/lib/api-response';
import { toChineseWords } from '@/lib/amount-converter';

/**
 * 格式化支付证明单响应数据
 */
function formatVoucherResponse(voucher: any) {
  const approvals = JSON.parse(voucher.approvals);

  return {
    id: voucher.id,
    reimbursementItemId: voucher.reimbursementItemId,
    date: voucher.date,
    department: voucher.department,
    paymentMethod: voucher.paymentMethod,
    payeeName: voucher.payeeName,
    bankName: voucher.bankName,
    bankAccount: voucher.bankAccount,
    summary: {
      transportation: voucher.transportation,
      meals: voucher.meals,
      accommodation: voucher.accommodation,
      office: voucher.office,
      other: voucher.other,
    },
    subtotal: voucher.subtotal,
    tax: voucher.tax,
    total: voucher.total,
    totalInChinese: voucher.totalInChinese,
    approvals,
    notes: voucher.notes,
    createdAt: voucher.createdAt.toISOString(),
    updatedAt: voucher.updatedAt.toISOString(),
  };
}

/**
 * GET /api/voucher/:id - 获取支付证明单数据
 * 
 * 如果支付证明单不存在，则自动生成
 * 如果支付证明单存在但金额为0且有发票，则重新生成
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const item = await prisma.reimbursementItem.findUnique({
      where: { id },
      include: { invoices: true },
    });

    if (!item) {
      return ApiError.notFound('报销事项不存在');
    }

    let voucher = await prisma.paymentVoucher.findUnique({
      where: { reimbursementItemId: id },
    });

    // 如果支付证明单不存在，或者金额为0但有发票，则重新生成
    const shouldRegenerate = !voucher || (voucher.total === 0 && item.invoices.length > 0);

    if (shouldRegenerate) {
      const voucherData = await generatePaymentVoucher(id);
      
      // 准备要保存的金额数据
      const amountData = {
        transportation: voucherData.summary.transportation,
        meals: voucherData.summary.meals,
        accommodation: voucherData.summary.accommodation,
        office: voucherData.summary.office,
        other: voucherData.summary.other,
        subtotal: voucherData.subtotal,
        tax: voucherData.tax,
        total: voucherData.total,
        totalInChinese: voucherData.totalInChinese,
      };
      
      if (voucher) {
        // 更新现有支付证明单的金额
        voucher = await prisma.paymentVoucher.update({
          where: { reimbursementItemId: id },
          data: amountData,
        });
      } else {
        // 创建新支付证明单
        voucher = await prisma.paymentVoucher.create({
          data: {
            reimbursementItemId: id,
            date: voucherData.date,
            department: voucherData.department,
            paymentMethod: voucherData.paymentMethod,
            payeeName: voucherData.payeeName,
            bankName: voucherData.bankName,
            bankAccount: voucherData.bankAccount,
            ...amountData,
            approvals: JSON.stringify(voucherData.approvals),
            notes: voucherData.notes,
          },
        });
      }
    }

    return successResponse(formatVoucherResponse(voucher));
  } catch (error) {
    console.error('获取支付证明单失败:', error);
    return ApiError.internalError(
      error instanceof Error ? error.message : '获取支付证明单失败'
    );
  }
}


/**
 * PUT /api/voucher/:id - 更新支付证明单
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingVoucher = await prisma.paymentVoucher.findUnique({
      where: { reimbursementItemId: id },
    });

    if (!existingVoucher) {
      return ApiError.notFound('支付证明单不存在');
    }

    const updateData: Record<string, any> = {};

    // 简单字段更新
    const simpleFields = ['date', 'department', 'paymentMethod', 'payeeName', 'bankName', 'bankAccount', 'notes'];
    simpleFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // 税金更新需要重新计算
    if (body.tax !== undefined) {
      const tax = Number(body.tax);
      if (isNaN(tax) || tax < 0) {
        return ApiError.badRequest('税金格式无效');
      }
      
      updateData.tax = tax;
      updateData.total = existingVoucher.subtotal + tax;
      updateData.totalInChinese = toChineseWords(updateData.total);
    }

    // 审批信息更新
    if (body.approvals !== undefined) {
      updateData.approvals = JSON.stringify(body.approvals);
    }

    const updatedVoucher = await prisma.paymentVoucher.update({
      where: { reimbursementItemId: id },
      data: updateData,
    });

    return successResponse(formatVoucherResponse(updatedVoucher));
  } catch (error) {
    console.error('更新支付证明单失败:', error);
    return ApiError.internalError(
      error instanceof Error ? error.message : '更新支付证明单失败'
    );
  }
}
