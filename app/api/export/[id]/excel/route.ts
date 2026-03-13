import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exportToExcel } from '@/lib/exporter';
import { errorResponse } from '@/lib/api-response';

/**
 * GET /api/export/:id/excel - 导出报销事项为 Excel 文件
 * 
 * @returns Excel 文件内容
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
      return errorResponse('NOT_FOUND', '报销事项不存在', 404);
    }

    const buffer = exportToExcel(item);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="reimbursement-${id}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('导出 Excel 失败:', error);
    return errorResponse('EXPORT_ERROR', '导出 Excel 失败，请稍后重试', 500);
  }
}
