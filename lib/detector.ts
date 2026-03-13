/**
 * 去重检测器
 * 检测可能重复的发票并提示用户
 */

/**
 * 发票接口（用于去重检测）
 */
export interface Invoice {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: Date | string;
}

/**
 * 去重检测结果
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedInvoice?: Invoice;
  confidence: number;
}

/**
 * 去重检测器接口
 */
export interface DuplicateDetector {
  checkDuplicate(
    fileName: string,
    fileSize: number,
    existingInvoices: Invoice[]
  ): DuplicateCheckResult;
}

/**
 * 基于文件名和文件大小的去重检测器实现
 * 验证需求: 18.1, 18.2
 */
class FileBasedDuplicateDetector implements DuplicateDetector {
  /**
   * 检测是否存在可能重复的发票
   * 
   * 检测逻辑：
   * - 文件名和文件大小完全相同：高置信度重复（confidence = 1.0）
   * - 仅文件名相同：中等置信度重复（confidence = 0.6）
   * - 仅文件大小相同：低置信度重复（confidence = 0.3）
   * 
   * @param fileName - 待检测的文件名
   * @param fileSize - 待检测的文件大小（字节）
   * @param existingInvoices - 已存在的发票列表
   * @returns 去重检测结果
   */
  checkDuplicate(
    fileName: string,
    fileSize: number,
    existingInvoices: Invoice[]
  ): DuplicateCheckResult {
    // 处理空列表或无效输入
    if (!existingInvoices || existingInvoices.length === 0) {
      return {
        isDuplicate: false,
        confidence: 0,
      };
    }

    if (!fileName || fileSize <= 0) {
      return {
        isDuplicate: false,
        confidence: 0,
      };
    }

    // 标准化文件名（转小写，便于比较）
    const normalizedFileName = fileName.toLowerCase().trim();

    // 查找匹配的发票
    let bestMatch: Invoice | undefined;
    let highestConfidence = 0;

    for (const invoice of existingInvoices) {
      const existingFileName = invoice.fileName.toLowerCase().trim();
      const existingFileSize = invoice.fileSize;

      // 检查文件名和文件大小是否匹配
      const fileNameMatch = normalizedFileName === existingFileName;
      const fileSizeMatch = fileSize === existingFileSize;

      let confidence = 0;

      if (fileNameMatch && fileSizeMatch) {
        // 文件名和文件大小都匹配：高置信度
        confidence = 1.0;
      } else if (fileNameMatch) {
        // 仅文件名匹配：中等置信度
        confidence = 0.6;
      } else if (fileSizeMatch) {
        // 仅文件大小匹配：低置信度
        confidence = 0.3;
      }

      // 更新最佳匹配
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = invoice;
      }
    }

    // 置信度阈值：大于 0.5 视为可能重复
    const isDuplicate = highestConfidence > 0.5;

    return {
      isDuplicate,
      matchedInvoice: isDuplicate ? bestMatch : undefined,
      confidence: highestConfidence,
    };
  }
}

/**
 * 导出检测器单例实例
 */
export const detector = new FileBasedDuplicateDetector();

/**
 * 便捷函数：检测是否存在可能重复的发票
 * 
 * @param fileName - 待检测的文件名
 * @param fileSize - 待检测的文件大小（字节）
 * @param existingInvoices - 已存在的发票列表
 * @returns 去重检测结果
 */
export function checkDuplicate(
  fileName: string,
  fileSize: number,
  existingInvoices: Invoice[]
): DuplicateCheckResult {
  return detector.checkDuplicate(fileName, fileSize, existingInvoices);
}
