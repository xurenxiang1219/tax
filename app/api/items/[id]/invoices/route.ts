import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFileFormat, validateFileSize, saveFile } from '@/lib/file-handler';
import { checkDuplicate } from '@/lib/detector';
import { successResponse, ApiError } from '@/lib/api-response';
import type { Invoice } from '@/lib/detector';

interface SuccessResult {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  amount: number | null;
  category: string;
  ocrStatus: string;
  ocrText: string | null;
  createdAt: string;
  reimbursementItemId: string;
  isDuplicate?: boolean;
  duplicateWarning?: string;
}

interface FailedResult {
  fileName: string;
  error: string;
}

type ProcessFileResult =
  | { success: true; data: SuccessResult }
  | { success: false; error: string };

/**
 * OCR 识别结果类型
 */
type OCRResult = {
  finalAmount: number | null;
  finalCategory: string;
  ocrStatus: 'success' | 'failed';
  ocrText: string | null;
};

/**
 * 创建失败的 OCR 结果
 */
function createFailedOCRResult(): OCRResult {
  return {
    finalAmount: null,
    finalCategory: 'other',
    ocrStatus: 'failed',
    ocrText: null,
  };
}

/**
 * 验证文件格式和大小
 * 
 * @param fileName - 文件名
 * @param fileType - 文件类型
 * @param fileSize - 文件大小
 * @returns 验证结果
 */
function validateFile(fileName: string, fileType: string, fileSize: number) {
  const formatValidation = validateFileFormat(fileName, fileType);
  if (!formatValidation.valid) {
    return { valid: false, error: formatValidation.error || '文件格式不支持' };
  }

  const sizeValidation = validateFileSize(fileSize);
  if (!sizeValidation.valid) {
    return { valid: false, error: sizeValidation.error || '文件大小超过限制' };
  }

  return { valid: true };
}

/**
 * 记录处理结果日志
 * 
 * @param fileName - 文件名
 * @param success - 是否成功
 * @param error - 错误信息（可选）
 */
function logProcessResult(fileName: string, success: boolean, error?: string) {
  if (success) {
    console.log(`[API] 文件处理成功: ${fileName}`);
  } else {
    console.log(`[API] 文件处理失败: ${fileName}, 错误: ${error}`);
  }
}

/**
 * 创建标准错误响应
 * 
 * @param code - 错误代码
 * @param message - 错误消息
 * @param status - HTTP 状态码
 * @param details - 详细错误信息（可选）
 */
function createErrorResponse(code: string, message: string, status: number, details?: string) {
  return ApiError.custom(code, message, status, details);
}

/**
 * 更新发票 OCR 信息
 * 
 * @param invoiceId - 发票 ID
 * @param ocrResult - OCR 识别结果
 * @returns 更新后的发票信息
 */
async function updateInvoiceOCR(invoiceId: string, ocrResult: OCRResult) {
  return await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amount: ocrResult.finalAmount,
      category: ocrResult.finalCategory,
      ocrStatus: ocrResult.ocrStatus,
      ocrText: ocrResult.ocrText,
    },
  });
}

/**
 * 构建成功结果对象
 * 
 * @param updatedInvoice - 更新后的发票数据
 * @param duplicateCheck - 重复检查结果
 * @returns 格式化的成功结果
 */
function buildSuccessResult(updatedInvoice: any, duplicateCheck: { isDuplicate: boolean; matchedInvoice?: any; confidence?: number }): SuccessResult {
  const result: SuccessResult = {
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
    reimbursementItemId: updatedInvoice.reimbursementItemId,
  };

  if (duplicateCheck.isDuplicate && duplicateCheck.matchedInvoice) {
    result.isDuplicate = true;
    result.duplicateWarning = `检测到可能重复的发票：${duplicateCheck.matchedInvoice.fileName}（置信度：${(duplicateCheck.confidence! * 100).toFixed(0)}%）`;
  }

  return result;
}

/**
 * 执行 OCR 识别并更新发票信息
 *
 * @param file - 待识别的文件
 * @returns OCR 结果（金额、分类、状态、文本）
 */
async function performOCRRecognition(file: File): Promise<OCRResult> {
  console.log(`[API] 调用服务端 OCR 识别: ${file.name}`);

  try {
    const { recognizeFile } = await import('@/lib/ocr');
    const { classifyInvoice } = await import('@/lib/classifier');

    const ocrResult = await recognizeFile(file);
    
    if (!ocrResult.success) {
      console.error(`[API] OCR 识别失败: ${file.name}`, ocrResult.error);
      return createFailedOCRResult();
    }
    
    const ocrText = ocrResult.text || '';
    const category = classifyInvoice(ocrText);
    const amount = ocrResult.amount ?? null;
    
    return {
      finalAmount: amount,
      finalCategory: category,
      ocrStatus: 'success',
      ocrText,
    };
  } catch (error) {
    console.error(`[API] OCR 识别失败: ${file.name}`, error);
    return createFailedOCRResult();
  }
}

/**
 * 处理单个文件上传
 * 
 * @param file - 待处理的文件
 * @param itemId - 报销事项 ID
 * @param existingInvoices - 已存在的发票列表（用于去重检测）
 * @returns 处理结果
 */
async function processFile(
  file: File,
  itemId: string,
  existingInvoices: Invoice[]
): Promise<ProcessFileResult> {
  try {
    const { name: fileName, size: fileSize, type: fileType } = file;
    console.log(`[API] 开始处理文件: ${fileName} (大小: ${fileSize} 字节, 类型: ${fileType})`);

    const validation = validateFile(fileName, fileType, fileSize);
    if (!validation.valid) {
      return { success: false, error: validation.error! };
    }

    const duplicateCheck = checkDuplicate(fileName, fileSize, existingInvoices);

    const invoice = await prisma.invoice.create({
      data: {
        fileName,
        fileSize,
        fileType,
        filePath: '',
        reimbursementItemId: itemId,
        ocrStatus: 'processing',
        category: 'other',
      },
    });
    console.log(`[API] 创建发票记录: ${invoice.id}`);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const saveResult = await saveFile(fileBuffer, itemId, invoice.id, fileName);

    if (!saveResult.success) {
      await prisma.invoice.delete({ where: { id: invoice.id } });
      return { success: false, error: saveResult.error || '文件保存失败' };
    }

    console.log(`[API] 文件已保存: ${saveResult.filePath}`);

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { filePath: saveResult.filePath! },
    });

    const ocrResult = await performOCRRecognition(file);
    const updatedInvoice = await updateInvoiceOCR(invoice.id, ocrResult);
    console.log(`[API] 发票信息已更新: ${invoice.id}, 状态: ${ocrResult.ocrStatus}, 金额: ${ocrResult.finalAmount}, 分类: ${ocrResult.finalCategory}`);

    const result = buildSuccessResult(updatedInvoice, duplicateCheck);
    return { success: true, data: result };
  } catch (error) {
    console.error(`[API] 处理文件 ${file.name} 失败:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '处理文件时发生未知错误',
    };
  }
}

/**
 * POST /api/items/:id/invoices - 上传发票
 * 
 * 验证需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 12.1, 12.2, 12.3, 12.4, 18.1, 18.2
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    console.log(`[API] 收到发票上传请求, 报销事项 ID: ${itemId}`);

    const item = await prisma.reimbursementItem.findUnique({
      where: { id: itemId },
      include: {
        invoices: {
          select: { id: true, fileName: true, fileSize: true, createdAt: true },
        },
      },
    });

    if (!item) {
      console.log(`[API] 报销事项不存在: ${itemId}`);
      return createErrorResponse('ITEM_NOT_FOUND', '报销事项不存在', 404);
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`[API] 上传文件数: ${files.length}`);

    if (!files?.length) {
      console.log(`[API] 未提供文件`);
      return createErrorResponse('NO_FILES', '未提供文件', 400);
    }

    const successResults: SuccessResult[] = [];
    const failedResults: FailedResult[] = [];

    for (const file of files) {
      const processResult = await processFile(file, itemId, item.invoices);
      
      if (processResult.success) {
        successResults.push(processResult.data);
        logProcessResult(file.name, true);
      } else {
        failedResults.push({ fileName: file.name, error: processResult.error });
        logProcessResult(file.name, false, processResult.error);
      }
    }

    console.log(`[API] 上传完成, 成功: ${successResults.length}, 失败: ${failedResults.length}`);
    return successResponse({ success: successResults, failed: failedResults }, 201);
  } catch (error) {
    console.error('[API] 上传发票失败:', error);
    return createErrorResponse(
      'UPLOAD_ERROR',
      '上传发票失败，请稍后重试',
      500,
      error instanceof Error ? error.message : '未知错误'
    );
  }
}

/**
 * PUT /api/items/:id/invoices - 手动重新识别发票
 * 
 * 用于未识别成功的发票，手动触发重新 OCR 识别并更新数据
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return createErrorResponse('MISSING_INVOICE_ID', '缺少发票 ID', 400);
    }

    console.log(`[API] 手动重新识别发票: ${invoiceId}`);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return createErrorResponse('INVOICE_NOT_FOUND', '发票不存在', 404);
    }

    if (invoice.reimbursementItemId !== itemId) {
      return createErrorResponse('FORBIDDEN', '无权访问此发票', 403);
    }

    const { readFileSync } = await import('fs');
    const fileBuffer = readFileSync(invoice.filePath);
    const file = new File([fileBuffer], invoice.fileName, { type: invoice.fileType });

    console.log(`[API] 重新识别文件: ${invoice.fileName}`);
    const ocrResult = await performOCRRecognition(file);
    const updatedInvoice = await updateInvoiceOCR(invoiceId, ocrResult);

    console.log(`[API] 发票重新识别完成: ${invoiceId}, 状态: ${updatedInvoice.ocrStatus}, 金额: ${updatedInvoice.amount}, 分类: ${updatedInvoice.category}`);

    return successResponse({
      id: updatedInvoice.id,
      fileName: updatedInvoice.fileName,
      amount: updatedInvoice.amount,
      category: updatedInvoice.category,
      ocrStatus: updatedInvoice.ocrStatus,
      ocrText: updatedInvoice.ocrText,
      updatedAt: updatedInvoice.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[API] 重新识别发票失败:', error);
    return createErrorResponse(
      'REOCR_ERROR',
      '重新识别发票失败，请稍后重试',
      500,
      error instanceof Error ? error.message : '未知错误'
    );
  }
}