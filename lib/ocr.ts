import Tesseract from 'tesseract.js';
import { isAzureOCRConfigured, recognizeWithAzure } from './azure-ocr';
import { extractAmount } from './amount-extractor';

/**
 * OCR 识别结果
 */
export interface OCRResult {
  success: boolean;
  text?: string;
  amount?: number;
  error?: string;
}

/**
 * 支持的文件类型常量
 */
const SUPPORTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

/**
 * 模拟 OCR 识别结果（用于演示）
 * 
 * @param fileName - 文件名
 * @returns 模拟的 OCR 结果
 */
function simulateOCRResult(fileName: string): OCRResult {
  const fileNameLower = fileName.toLowerCase();
  
  // 模拟数据映射表
  const mockDataMap: Record<string, { text: string; amount: number }> = {
    taxi: { text: '出租车发票\n起点：北京市朝阳区\n终点：北京市海淀区\n金额：45.50元', amount: 45.50 },
    出租车: { text: '出租车发票\n起点：北京市朝阳区\n终点：北京市海淀区\n金额：45.50元', amount: 45.50 },
    meal: { text: '餐饮发票\n商户：北京烤鸭店\n消费金额：128.00元\n日期：2026-03-12', amount: 128.00 },
    餐饮: { text: '餐饮发票\n商户：北京烤鸭店\n消费金额：128.00元\n日期：2026-03-12', amount: 128.00 },
    restaurant: { text: '餐饮发票\n商户：北京烤鸭店\n消费金额：128.00元\n日期：2026-03-12', amount: 128.00 },
    hotel: { text: '住宿发票\n酒店：北京国际大酒店\n房费：380.00元\n入住日期：2026-03-11', amount: 380.00 },
    住宿: { text: '住宿发票\n酒店：北京国际大酒店\n房费：380.00元\n入住日期：2026-03-11', amount: 380.00 },
    酒店: { text: '住宿发票\n酒店：北京国际大酒店\n房费：380.00元\n入住日期：2026-03-11', amount: 380.00 },
    office: { text: '办公用品发票\n商品：A4纸、签字笔\n金额：85.60元', amount: 85.60 },
    办公: { text: '办公用品发票\n商品：A4纸、签字笔\n金额：85.60元', amount: 85.60 },
    文具: { text: '办公用品发票\n商品：A4纸、签字笔\n金额：85.60元', amount: 85.60 },
  };

  // 查找匹配的模拟数据
  for (const [key, data] of Object.entries(mockDataMap)) {
    if (fileNameLower.includes(key)) {
      return { success: true, text: data.text, amount: data.amount };
    }
  }

  // 默认生成随机金额
  const randomAmount = Math.floor(Math.random() * 500) + 10;
  return {
    success: true,
    text: `发票\n金额：${randomAmount}.00元\n日期：2026-03-12`,
    amount: randomAmount,
  };
}

/**
 * 对图片进行 OCR 识别
 * 
 * 优先使用 Azure OCR（如果已配置），否则使用 Tesseract.js
 * 
 * @param imageFile - 图片文件（JPEG 或 PNG）
 * @param timeout - 超时时间（毫秒），默认 30 秒
 * @returns OCR 识别结果
 */
export async function recognizeImage(
  imageFile: File,
  timeout: number = 30000
): Promise<OCRResult> {
  try {
    if (isAzureOCRConfigured()) {
      console.log('[OCR] 使用 Azure OCR 识别图片:', imageFile.name);
      const buffer = await imageFile.arrayBuffer();
      return recognizeWithAzure(Buffer.from(buffer), timeout);
    }

    console.log('[OCR] 使用 Tesseract.js 识别图片:', imageFile.name);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OCR 识别超时')), timeout);
    });

    const ocrPromise = Tesseract.recognize(imageFile, 'chi_sim+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Tesseract 进度: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const result = await Promise.race([ocrPromise, timeoutPromise]);
    const text = result.data.text;
    const amount = extractAmount(text);

    return {
      success: true,
      text,
      ...(amount && { amount }),
    };
  } catch (error) {
    console.error('[OCR] 识别失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR 识别失败',
    };
  }
}

/**
 * 对 PDF 文件进行 OCR 识别
 * 
 * PDF 文件会被转换为图片后进行识别
 * 如果 PDF 包含多页，会处理所有页面并提取金额
 * 
 * @param pdfFile - PDF 文件
 * @param timeout - 超时时间（毫秒），默认 30 秒
 * @returns OCR 识别结果
 */
export async function recognizePDF(
  pdfFile: File,
  timeout: number = 30000
): Promise<OCRResult> {
  try {
    console.log('[OCR] 开始处理 PDF 文件:', pdfFile.name);
    const pdfjsLib = await import('pdfjs-dist');
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    console.log(`[OCR] PDF 总页数: ${pdf.numPages}`);
    let allText = '';
    let foundAmount: number | null = null;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('无法创建 canvas context');

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport } as any).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas 转换失败'))), 'image/png');
      });

      const imageFile = new File([blob], `page-${pageNum}.png`, { type: 'image/png' });
      console.log(`[OCR] 识别 PDF 第 ${pageNum} 页`);
      const result = await recognizeImage(imageFile, timeout);

      if (result.success && result.text) {
        allText += result.text + '\n';
        if (result.amount && !foundAmount) {
          foundAmount = result.amount;
        }
      }
    }

    if (!foundAmount) {
      foundAmount = extractAmount(allText);
    }

    return {
      success: true,
      text: allText.trim(),
      ...(foundAmount && { amount: foundAmount }),
    };
  } catch (error) {
    console.error('[OCR] PDF 识别失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF OCR 识别失败',
    };
  }
}

/**
 * 对文件进行 OCR 识别（自动判断文件类型）
 * 
 * @param file - 文件（PDF、JPEG 或 PNG）
 * @param timeout - 超时时间（毫秒），默认 30 秒
 * @returns OCR 识别结果
 */
export async function recognizeFile(
  file: File,
  timeout: number = 30000
): Promise<OCRResult> {
  if (!SUPPORTED_FILE_TYPES.includes(file.type as any)) {
    return {
      success: false,
      error: '不支持的文件类型',
    };
  }

  console.log('[OCR] 开始识别文件:', file.name, '类型:', file.type);

  if (typeof window === 'undefined') {
    console.log('[OCR] 在服务器端环境中处理');
    const azureConfigured = isAzureOCRConfigured();
    console.log('[OCR] Azure OCR 配置状态:', azureConfigured ? '已配置' : '未配置');

    if (azureConfigured) {
      console.log('[OCR] 使用 Azure OCR 进行识别');
      const buffer = await file.arrayBuffer();
      return recognizeWithAzure(Buffer.from(buffer), timeout);
    }

    console.log('[OCR] 使用模拟 OCR 识别');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return simulateOCRResult(file.name);
  }

  console.log('[OCR] 在客户端环境中处理');
  if (file.type === 'application/pdf') {
    return recognizePDF(file, timeout);
  }
  
  return recognizeImage(file, timeout);
}
