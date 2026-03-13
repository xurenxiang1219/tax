import fs from 'fs/promises';
import path from 'path';

/**
 * 支持的文件格式
 */
const SUPPORTED_FORMATS = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
} as const;

/**
 * 最大文件大小（10MB）
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * 上传目录基础路径
 */
const UPLOAD_BASE_DIR = 'uploads/invoices';

/**
 * 文件验证结果
 */
interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 文件保存结果
 */
interface FileSaveResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * 验证文件格式是否支持
 * 
 * 检查文件扩展名和 MIME 类型是否在支持的格式列表中，
 * 并确保扩展名与 MIME 类型匹配，防止文件伪装攻击
 * 
 * 验证需求: 2.1, 2.2, 2.3, 2.4
 * 
 * @param fileName - 文件名（包含扩展名）
 * @param mimeType - 文件的 MIME 类型
 * @returns 验证结果，包含是否有效和错误信息
 */
export function validateFileFormat(
  fileName: string,
  mimeType: string
): FileValidationResult {
  const ext = path.extname(fileName).toLowerCase();
  const supportedExtensions = Object.values(SUPPORTED_FORMATS).flat() as string[];

  // 检查扩展名是否在支持列表中
  if (!supportedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `不支持的文件格式。支持的格式：PDF、JPEG、PNG`,
    };
  }

  // 验证 MIME 类型与扩展名是否匹配，防止文件伪装
  const expectedExtensions = SUPPORTED_FORMATS[mimeType as keyof typeof SUPPORTED_FORMATS];
  if (!expectedExtensions || !(expectedExtensions as readonly string[]).includes(ext)) {
    return {
      valid: false,
      error: `文件格式不匹配。文件扩展名为 ${ext}，但 MIME 类型为 ${mimeType}`,
    };
  }

  return { valid: true };
}

/**
 * 验证文件大小
 * 验证需求: 2.8
 */
export function validateFileSize(fileSize: number): FileValidationResult {
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件大小超过限制。最大允许 10MB，当前文件大小为 ${(fileSize / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  if (fileSize <= 0) {
    return {
      valid: false,
      error: '文件大小无效',
    };
  }

  return { valid: true };
}

/**
 * 生成安全的文件名（移除特殊字符和危险模式）
 */
function sanitizeFileName(fileName: string): string {
  // 移除路径分隔符和特殊字符
  let sanitized = fileName.replace(/[/\\?%*:|"<>]/g, '_');
  
  // 防止路径遍历攻击：替换 .. 为 __
  sanitized = sanitized.replace(/\.\./g, '__');
  
  return sanitized;
}

/**
 * 保存文件到本地文件系统
 * 文件路径格式：uploads/invoices/{itemId}/{invoiceId}_{fileName}
 * 验证需求: 2.5, 2.6
 */
export async function saveFile(
  fileBuffer: Buffer,
  itemId: string,
  invoiceId: string,
  originalFileName: string
): Promise<FileSaveResult> {
  try {
    // 清理文件名
    const sanitizedFileName = sanitizeFileName(originalFileName);
    
    // 构建目录路径
    const dirPath = path.join(UPLOAD_BASE_DIR, itemId);
    
    // 构建完整文件路径
    const fileName = `${invoiceId}_${sanitizedFileName}`;
    const filePath = path.join(dirPath, fileName);

    // 确保目录存在
    await fs.mkdir(dirPath, { recursive: true });

    // 写入文件
    await fs.writeFile(filePath, fileBuffer);

    return {
      success: true,
      filePath,
    };
  } catch (error) {
    return {
      success: false,
      error: `文件保存失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 删除单个文件
 * 验证需求: 8.3, 10.3
 */
export async function deleteFile(filePath: string): Promise<FileSaveResult> {
  try {
    // 检查文件是否存在
    await fs.access(filePath);
    
    // 删除文件
    await fs.unlink(filePath);

    return {
      success: true,
    };
  } catch (error) {
    // 如果文件不存在，也视为成功（幂等性）
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        success: true,
      };
    }

    return {
      success: false,
      error: `文件删除失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 删除报销事项的所有发票文件
 * 验证需求: 8.3
 */
export async function deleteItemFiles(itemId: string): Promise<FileSaveResult> {
  try {
    const dirPath = path.join(UPLOAD_BASE_DIR, itemId);

    // 检查目录是否存在
    try {
      await fs.access(dirPath);
    } catch {
      // 目录不存在，视为成功
      return { success: true };
    }

    // 删除整个目录及其内容
    await fs.rm(dirPath, { recursive: true, force: true });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: `目录删除失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 读取文件内容
 * 验证需求: 11.2
 */
export async function readFile(filePath: string): Promise<Buffer | null> {
  try {
    // 检查文件是否存在
    await fs.access(filePath);
    
    // 读取文件
    const buffer = await fs.readFile(filePath);
    return buffer;
  } catch (error) {
    console.error(`文件读取失败: ${filePath}`, error);
    return null;
  }
}

/**
 * 检查文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取文件信息
 */
export async function getFileInfo(filePath: string) {
  try {
    const stats = await fs.stat(filePath);
    return {
      exists: true,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  } catch {
    return {
      exists: false,
    };
  }
}
