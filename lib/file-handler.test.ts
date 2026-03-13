import { describe, it, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';
import fs from 'fs/promises';
import path from 'path';
import {
  validateFileFormat,
  validateFileSize,
  saveFile,
  deleteFile,
  deleteItemFiles,
  readFile,
  fileExists,
  getFileInfo,
} from './file-handler';

// 测试用的临时目录
const TEST_UPLOAD_DIR = 'uploads/invoices';

describe('文件处理工具', () => {
  // 清理测试文件
  afterEach(async () => {
    try {
      await fs.rm(TEST_UPLOAD_DIR, { recursive: true, force: true });
    } catch {
      // 忽略错误
    }
  });

  describe('validateFileFormat - 文件格式验证', () => {
    it('应该接受 PDF 格式', () => {
      const result = validateFileFormat('invoice.pdf', 'application/pdf');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受 JPEG 格式（.jpg）', () => {
      const result = validateFileFormat('invoice.jpg', 'image/jpeg');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受 JPEG 格式（.jpeg）', () => {
      const result = validateFileFormat('invoice.jpeg', 'image/jpeg');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受 PNG 格式', () => {
      const result = validateFileFormat('invoice.png', 'image/png');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝不支持的格式', () => {
      const result = validateFileFormat('invoice.doc', 'application/msword');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不支持的文件格式');
    });

    it('应该拒绝 MIME 类型与扩展名不匹配的文件', () => {
      const result = validateFileFormat('invoice.pdf', 'image/jpeg');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('文件格式不匹配');
    });

    it('应该不区分大小写处理文件扩展名', () => {
      const result = validateFileFormat('invoice.PDF', 'application/pdf');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateFileSize - 文件大小验证', () => {
    it('应该接受小于 10MB 的文件', () => {
      const result = validateFileSize(5 * 1024 * 1024); // 5MB
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受正好 10MB 的文件', () => {
      const result = validateFileSize(10 * 1024 * 1024); // 10MB
      expect(result.valid).toBe(true);
    });

    it('应该拒绝超过 10MB 的文件', () => {
      const result = validateFileSize(11 * 1024 * 1024); // 11MB
      expect(result.valid).toBe(false);
      expect(result.error).toContain('文件大小超过限制');
    });

    it('应该拒绝大小为 0 的文件', () => {
      const result = validateFileSize(0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('文件大小无效');
    });

    it('应该拒绝负数大小', () => {
      const result = validateFileSize(-100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('文件大小无效');
    });
  });

  describe('saveFile - 文件保存', () => {
    it('应该成功保存文件到正确的路径', async () => {
      const fileBuffer = Buffer.from('test content');
      const itemId = 'item123';
      const invoiceId = 'invoice456';
      const fileName = 'test.pdf';

      const result = await saveFile(fileBuffer, itemId, invoiceId, fileName);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(`uploads/invoices/${itemId}/${invoiceId}_${fileName}`);
      expect(result.error).toBeUndefined();

      // 验证文件确实被创建
      const exists = await fileExists(result.filePath!);
      expect(exists).toBe(true);
    });

    it('应该自动创建不存在的目录', async () => {
      const fileBuffer = Buffer.from('test content');
      const itemId = 'newitem';
      const invoiceId = 'newinvoice';
      const fileName = 'test.pdf';

      const result = await saveFile(fileBuffer, itemId, invoiceId, fileName);

      expect(result.success).toBe(true);
      
      // 验证目录被创建
      const dirPath = path.join(TEST_UPLOAD_DIR, itemId);
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('应该清理文件名中的特殊字符', async () => {
      const fileBuffer = Buffer.from('test content');
      const itemId = 'item123';
      const invoiceId = 'invoice456';
      const fileName = 'test/file:name?.pdf';

      const result = await saveFile(fileBuffer, itemId, invoiceId, fileName);

      expect(result.success).toBe(true);
      expect(result.filePath).toContain('test_file_name_.pdf');
    });

    it('应该保存正确的文件内容', async () => {
      const content = 'Hello, World!';
      const fileBuffer = Buffer.from(content);
      const itemId = 'item123';
      const invoiceId = 'invoice456';
      const fileName = 'test.txt';

      const result = await saveFile(fileBuffer, itemId, invoiceId, fileName);
      expect(result.success).toBe(true);

      // 读取文件并验证内容
      const savedContent = await readFile(result.filePath!);
      expect(savedContent?.toString()).toBe(content);
    });
  });

  describe('deleteFile - 文件删除', () => {
    it('应该成功删除存在的文件', async () => {
      // 先创建一个文件
      const fileBuffer = Buffer.from('test content');
      const itemId = 'item123';
      const invoiceId = 'invoice456';
      const fileName = 'test.pdf';

      const saveResult = await saveFile(fileBuffer, itemId, invoiceId, fileName);
      expect(saveResult.success).toBe(true);

      // 删除文件
      const deleteResult = await deleteFile(saveResult.filePath!);
      expect(deleteResult.success).toBe(true);

      // 验证文件已被删除
      const exists = await fileExists(saveResult.filePath!);
      expect(exists).toBe(false);
    });

    it('删除不存在的文件应该返回成功（幂等性）', async () => {
      const result = await deleteFile('uploads/invoices/nonexistent/file.pdf');
      expect(result.success).toBe(true);
    });
  });

  describe('deleteItemFiles - 删除报销事项的所有文件', () => {
    it('应该删除报销事项目录及其所有文件', async () => {
      const itemId = 'item123';
      
      // 创建多个文件
      await saveFile(Buffer.from('content1'), itemId, 'invoice1', 'file1.pdf');
      await saveFile(Buffer.from('content2'), itemId, 'invoice2', 'file2.pdf');
      await saveFile(Buffer.from('content3'), itemId, 'invoice3', 'file3.pdf');

      // 删除整个目录
      const result = await deleteItemFiles(itemId);
      expect(result.success).toBe(true);

      // 验证目录已被删除
      const dirPath = path.join(TEST_UPLOAD_DIR, itemId);
      const exists = await fileExists(dirPath);
      expect(exists).toBe(false);
    });

    it('删除不存在的目录应该返回成功', async () => {
      const result = await deleteItemFiles('nonexistent-item');
      expect(result.success).toBe(true);
    });
  });

  describe('readFile - 文件读取', () => {
    it('应该成功读取存在的文件', async () => {
      const content = 'test file content';
      const fileBuffer = Buffer.from(content);
      const itemId = 'item123';
      const invoiceId = 'invoice456';
      const fileName = 'test.pdf';

      const saveResult = await saveFile(fileBuffer, itemId, invoiceId, fileName);
      expect(saveResult.success).toBe(true);

      const readBuffer = await readFile(saveResult.filePath!);
      expect(readBuffer).not.toBeNull();
      expect(readBuffer?.toString()).toBe(content);
    });

    it('读取不存在的文件应该返回 null', async () => {
      const result = await readFile('uploads/invoices/nonexistent/file.pdf');
      expect(result).toBeNull();
    });
  });

  describe('fileExists - 文件存在性检查', () => {
    it('存在的文件应该返回 true', async () => {
      const fileBuffer = Buffer.from('test content');
      const itemId = 'item123';
      const invoiceId = 'invoice456';
      const fileName = 'test.pdf';

      const saveResult = await saveFile(fileBuffer, itemId, invoiceId, fileName);
      const exists = await fileExists(saveResult.filePath!);
      expect(exists).toBe(true);
    });

    it('不存在的文件应该返回 false', async () => {
      const exists = await fileExists('uploads/invoices/nonexistent/file.pdf');
      expect(exists).toBe(false);
    });
  });

  describe('getFileInfo - 获取文件信息', () => {
    it('应该返回存在文件的信息', async () => {
      const content = 'test content';
      const fileBuffer = Buffer.from(content);
      const itemId = 'item123';
      const invoiceId = 'invoice456';
      const fileName = 'test.pdf';

      const saveResult = await saveFile(fileBuffer, itemId, invoiceId, fileName);
      const info = await getFileInfo(saveResult.filePath!);

      expect(info.exists).toBe(true);
      expect(info.size).toBe(content.length);
      expect(info.createdAt).toBeInstanceOf(Date);
      expect(info.modifiedAt).toBeInstanceOf(Date);
    });

    it('不存在的文件应该返回 exists: false', async () => {
      const info = await getFileInfo('uploads/invoices/nonexistent/file.pdf');
      expect(info.exists).toBe(false);
    });
  });
});

// 基于属性的测试
describe('文件处理工具 - 基于属性的测试', () => {
  afterEach(async () => {
    try {
      await fs.rm(TEST_UPLOAD_DIR, { recursive: true, force: true });
    } catch {
      // 忽略错误
    }
  });

  // Feature: invoice-reimbursement-system, Property 2: 支持的文件格式验证
  it('属性 2: 对于任何 PDF 或图片格式的文件，系统应该接受；对于其他格式应该拒绝', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { ext: '.pdf', mime: 'application/pdf' },
          { ext: '.jpg', mime: 'image/jpeg' },
          { ext: '.jpeg', mime: 'image/jpeg' },
          { ext: '.png', mime: 'image/png' }
        ),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && !s.includes('/')),
        (format, baseName) => {
          const fileName = `${baseName}${format.ext}`;
          const result = validateFileFormat(fileName, format.mime);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );

    // 测试不支持的格式
    fc.assert(
      fc.property(
        fc.constantFrom('.doc', '.docx', '.txt', '.zip', '.exe', '.mp4'),
        fc.string({ minLength: 1, maxLength: 50 }),
        (ext, baseName) => {
          const fileName = `${baseName}${ext}`;
          const result = validateFileFormat(fileName, 'application/octet-stream');
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: invoice-reimbursement-system, Property 3: 文件上传的完整性验证
  it('属性 3: 对于任何成功上传的文件，文件应该同时存在于文件系统和可读取', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 1000 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/')),
        fc.constantFrom('test.pdf', 'test.jpg', 'test.png'),
        async (content, itemId, invoiceId, fileName) => {
          const fileBuffer = Buffer.from(content);
          
          // 保存文件
          const saveResult = await saveFile(fileBuffer, itemId, invoiceId, fileName);
          expect(saveResult.success).toBe(true);
          expect(saveResult.filePath).toBeDefined();

          // 验证文件存在
          const exists = await fileExists(saveResult.filePath!);
          expect(exists).toBe(true);

          // 验证文件可读取
          const readBuffer = await readFile(saveResult.filePath!);
          expect(readBuffer).not.toBeNull();
          expect(readBuffer?.length).toBe(content.length);

          // 清理
          await deleteFile(saveResult.filePath!);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: invoice-reimbursement-system, Property 16: 删除单张发票的完整性
  it('属性 16: 对于任何发票，删除操作应该从文件系统中移除该文件', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 1000 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/')),
        fc.constantFrom('test.pdf', 'test.jpg', 'test.png'),
        async (content, itemId, invoiceId, fileName) => {
          const fileBuffer = Buffer.from(content);
          
          // 保存文件
          const saveResult = await saveFile(fileBuffer, itemId, invoiceId, fileName);
          expect(saveResult.success).toBe(true);

          // 删除文件
          const deleteResult = await deleteFile(saveResult.filePath!);
          expect(deleteResult.success).toBe(true);

          // 验证文件已被删除
          const exists = await fileExists(saveResult.filePath!);
          expect(exists).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  // 文件大小验证属性
  it('属性: 对于任何小于等于 10MB 的文件大小，验证应该通过', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 * 1024 * 1024 }),
        (fileSize) => {
          const result = validateFileSize(fileSize);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('属性: 对于任何大于 10MB 的文件大小，验证应该失败', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10 * 1024 * 1024 + 1, max: 100 * 1024 * 1024 }),
        (fileSize) => {
          const result = validateFileSize(fileSize);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('文件大小超过限制');
        }
      ),
      { numRuns: 100 }
    );
  });

  // 文件名清理属性
  it('属性: 保存的文件路径不应该包含危险字符', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => !s.includes('/')),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (content, itemId, invoiceId, baseName) => {
          const fileBuffer = Buffer.from(content);
          const fileName = `${baseName}.pdf`;
          
          const saveResult = await saveFile(fileBuffer, itemId, invoiceId, fileName);
          expect(saveResult.success).toBe(true);
          
          // 验证路径不包含危险字符
          const dangerousChars = ['..', '//', '\\\\'];
          for (const char of dangerousChars) {
            expect(saveResult.filePath).not.toContain(char);
          }

          // 清理
          if (saveResult.filePath) {
            await deleteFile(saveResult.filePath);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
