import { prisma } from './prisma';
import { calculateByCategory, calculateTotal } from './aggregator';
import { toChineseWords } from './amount-converter';

/**
 * 支付证明单数据
 */
export interface PaymentVoucherData {
  id: string;
  reimbursementItemId: string;
  date: string;
  department: string;
  paymentMethod: string;
  payeeName: string;
  bankName: string;
  bankAccount: string;
  
  // 分类汇总
  summary: {
    transportation: number;
    meals: number;
    accommodation: number;
    office: number;
    other: number;
  };
  
  // 金额计算
  subtotal: number;
  tax: number;
  total: number;
  totalInChinese: string;
  
  approvals: Record<string, any>;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 根据报销事项生成支付证明单数据
 * 
 * @param reimbursementItemId - 报销事项 ID
 * @returns 支付证明单数据
 * @throws 当报销事项不存在时抛出错误
 */
export async function generatePaymentVoucher(
  reimbursementItemId: string
): Promise<PaymentVoucherData> {
  const item = await prisma.reimbursementItem.findUnique({
    where: { id: reimbursementItemId },
    include: { invoices: true },
  });

  if (!item) {
    throw new Error('报销事项不存在');
  }

  // 将数据库返回的发票转换为聚合器期望的格式
  // 数据库中的 category 已经是有效的分类值
  const invoices = item.invoices.map(invoice => ({
    amount: invoice.amount,
    category: invoice.category as any,
  }));

  const summary = calculateByCategory(invoices);
  const subtotal = calculateTotal(invoices);
  const tax = 0;
  const total = subtotal + tax;
  const totalInChinese = toChineseWords(total);
  const today = new Date().toISOString().split('T')[0];

  return {
    id: '',
    reimbursementItemId,
    date: today,
    department: '',
    paymentMethod: 'bank_transfer',
    payeeName: '',
    bankName: '',
    bankAccount: '',
    summary,
    subtotal,
    tax,
    total,
    totalInChinese,
    approvals: {},
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
