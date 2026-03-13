/**
 * Azure OCR 模块
 * 
 * 提供高精度的 OCR 识别能力
 * 需要配置 AZURE_VISION_ENDPOINT 和 AZURE_VISION_KEY 环境变量
 */

import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { OCRResult } from './ocr';
import { extractAmount } from './amount-extractor';

/**
 * 使用 Azure Form Recognizer 进行 OCR 识别
 * 
 * @param imageBuffer - 图片二进制数据
 * @param timeout - 超时时间（毫秒）
 * @returns OCR 识别结果
 */
export async function recognizeWithAzure(
  imageBuffer: Buffer,
  timeout: number = 30000
): Promise<OCRResult> {
  const endpoint = process.env.AZURE_VISION_ENDPOINT;
  const key = process.env.AZURE_VISION_KEY;

  if (!endpoint || !key) {
    console.error('[Azure OCR] 配置缺失: endpoint=', !!endpoint, 'key=', !!key);
    return {
      success: false,
      error: 'Azure OCR 未配置（缺少 AZURE_VISION_ENDPOINT 或 AZURE_VISION_KEY）',
    };
  }

  try {
    console.log('[Azure OCR] 开始调用 Azure Form Recognizer API');
    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));

    const poller = await client.beginAnalyzeDocument('prebuilt-read', imageBuffer, {
      onProgress: (state) => {
        console.log(`[Azure OCR] 分析进度: ${state.status}`);
      },
    });

    const result = await poller.pollUntilDone();

    if (!result.pages || result.pages.length === 0) {
      throw new Error('未获取到分析结果');
    }

    const textLines = result.pages.flatMap(
      (page) => page.lines?.map((line) => line.content) ?? []
    );
    const text = textLines.join('\n');

    console.log('[Azure OCR] 识别成功，提取文本长度:', text.length);

    const amount = extractAmount(text);

    return {
      success: true,
      text: text.trim(),
      ...(amount && { amount }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Azure OCR 识别失败';
    console.error('[Azure OCR] 识别失败:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 检查 Azure OCR 是否已配置
 * 
 * @returns 是否已配置
 */
export function isAzureOCRConfigured(): boolean {
  return !!(process.env.AZURE_VISION_ENDPOINT && process.env.AZURE_VISION_KEY);
}
