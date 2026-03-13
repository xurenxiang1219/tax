import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { ReimbursementItem, Invoice } from '@prisma/client';
import { toChineseWords } from './amount-converter';

/**
 * 报销事项详情（包含发票列表）
 */
export type ReimbursementItemWithInvoices = ReimbursementItem & {
  invoices: Invoice[];
};

/**
 * 分类汇总数据
 */
export interface CategorySummary {
  category: string;
  amount: number;
  count: number;
}

/**
 * 导出 Excel 文件
 * 
 * @param item - 报销事项（包含发票列表）
 * @returns Excel 文件的 Buffer
 */
export function exportToExcel(item: ReimbursementItemWithInvoices): Buffer {
  const workbook = XLSX.utils.book_new();
  const totalAmount = calculateTotalAmount(item.invoices);

  const detailData: any[][] = [
    ['发票报销明细表'],
    [],
    ['报销事项', item.title],
    ['创建时间', new Date(item.createdAt).toLocaleString('zh-CN')],
    ['备注', item.notes || '无'],
    [],
    ['序号', '文件名', '金额（元）', '分类', '上传时间'],
  ];

  item.invoices.forEach((invoice, index) => {
    detailData.push([
      index + 1,
      invoice.fileName,
      invoice.amount ?? 0,
      invoice.category,
      new Date(invoice.createdAt).toLocaleString('zh-CN'),
    ]);
  });

  detailData.push([]);
  detailData.push(['总计', '', totalAmount, '', '']);

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  detailSheet['!cols'] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(workbook, detailSheet, '明细表');

  const categorySummary = calculateCategorySummary(item.invoices);
  const summaryData: any[][] = [
    ['发票分类汇总表'],
    [],
    ['分类', '金额（元）', '发票数量'],
  ];

  categorySummary.forEach((summary) => {
    summaryData.push([summary.category, summary.amount, summary.count]);
  });

  const totalCount = categorySummary.reduce((sum, s) => sum + s.count, 0);
  summaryData.push([]);
  summaryData.push(['总计', totalAmount, totalCount]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, '汇总表');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * 导出 PDF 文件
 * 
 * @param item - 报销事项（包含发票列表）
 * @returns PDF 文件的 Buffer
 */
export function exportToPDF(item: ReimbursementItemWithInvoices): Buffer {
  const doc = new jsPDF();
  const totalAmount = calculateTotalAmount(item.invoices);

  doc.setFont('helvetica');
  doc.setFontSize(18);
  doc.text('Invoice Reimbursement Report', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`Title: ${item.title}`, 20, 40);
  doc.text(`Created: ${new Date(item.createdAt).toLocaleString('zh-CN')}`, 20, 50);
  doc.text(`Notes: ${item.notes || 'None'}`, 20, 60);

  doc.setFontSize(14);
  doc.text('Invoice Details', 20, 80);

  doc.setFontSize(10);
  let yPosition = 90;

  doc.text('No.', 20, yPosition);
  doc.text('File Name', 40, yPosition);
  doc.text('Amount', 120, yPosition);
  doc.text('Category', 150, yPosition);
  yPosition += 10;

  item.invoices.forEach((invoice, index) => {
    yPosition = checkAndAddPage(doc, yPosition);
    const amount = invoice.amount ?? 0;
    doc.text(`${index + 1}`, 20, yPosition);
    doc.text(invoice.fileName.substring(0, 30), 40, yPosition);
    doc.text(amount.toFixed(2), 120, yPosition);
    doc.text(invoice.category, 150, yPosition);
    yPosition += 10;
  });

  yPosition += 10;
  doc.setFontSize(12);
  doc.text(`Total Amount: ${totalAmount.toFixed(2)} CNY`, 20, yPosition);
  doc.text(`(${toChineseWords(totalAmount)})`, 20, yPosition + 10);

  yPosition += 30;
  yPosition = checkAndAddPage(doc, yPosition, 250);

  doc.setFontSize(14);
  doc.text('Category Summary', 20, yPosition);
  yPosition += 10;
  doc.setFontSize(10);

  const categorySummary = calculateCategorySummary(item.invoices);
  categorySummary.forEach((summary) => {
    yPosition = checkAndAddPage(doc, yPosition);
    doc.text(`${summary.category}: ${summary.amount.toFixed(2)} CNY (${summary.count} invoices)`, 20, yPosition);
    yPosition += 10;
  });

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * 计算总金额
 * 
 * @param invoices - 发票列表
 * @returns 总金额
 */
function calculateTotalAmount(invoices: Invoice[]): number {
  return invoices.reduce((sum, inv) => sum + (inv.amount ?? 0), 0);
}

/**
 * 检查并在需要时添加新页面
 * 
 * @param doc - PDF 文档对象
 * @param yPosition - 当前 Y 坐标
 * @param threshold - 分页阈值（默认 270）
 * @returns 新的 Y 坐标
 */
function checkAndAddPage(doc: jsPDF, yPosition: number, threshold: number = 270): number {
  if (yPosition > threshold) {
    doc.addPage();
    return 20;
  }
  return yPosition;
}

/**
 * 计算分类汇总
 * 
 * @param invoices - 发票列表
 * @returns 分类汇总数据
 */
function calculateCategorySummary(invoices: Invoice[]): CategorySummary[] {
  const summaryMap = new Map<string, CategorySummary>();

  invoices.forEach((invoice) => {
    const amount = invoice.amount ?? 0;
    const existing = summaryMap.get(invoice.category);
    if (existing) {
      existing.amount += amount;
      existing.count += 1;
    } else {
      summaryMap.set(invoice.category, {
        category: invoice.category,
        amount,
        count: 1,
      });
    }
  });

  return Array.from(summaryMap.values()).sort((a, b) => b.amount - a.amount);
}
