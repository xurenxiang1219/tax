import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from '@/lib/file-handler';
import { ApiError } from '@/lib/api-response';

/**
 * GET /api/invoices/:id/preview - 预览发票文件
 * 
 * 返回发票文件内容，支持 PDF 和图片格式
 * 验证需求: 11.1, 11.2, 11.3, 11.4, 11.5
 * 
 * @returns 发票文件内容
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = 'then' in context.params ? await context.params : context.params;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return ApiError.notFound('发票不存在');
    }

    const fileBuffer = await readFile(invoice.filePath);
    if (!fileBuffer) {
      console.error('读取发票文件失败:', invoice.filePath);
      return ApiError.notFound('发票文件不存在');
    }

    // 使用 .set() 方法设置 headers，避免 Content-Disposition 和 ETag 中的非 ASCII 字符导致错误
    const headers = new Headers();
    headers.set('Content-Type', invoice.fileType);
    headers.set('Content-Length', (invoice.fileSize ?? fileBuffer.length).toString());
    headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(invoice.fileName)}`);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    // 使用时间戳确保 ETag 只包含 ASCII 字符
    const updatedTime = invoice.updatedAt ? new Date(invoice.updatedAt).getTime() : Date.now();
    headers.set('ETag', `"${invoice.id}-${updatedTime}"`);

    return new Response(new Uint8Array(fileBuffer), { status: 200, headers });
  } catch (error) {
    console.error('预览发票失败:', error);
    return ApiError.databaseError(
      '预览发票失败，请稍后重试',
      error instanceof Error ? error.message : '未知错误'
    );
  }
}