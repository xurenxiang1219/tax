import { ReimbursementDetail } from '@/components/ReimbursementDetail';

/**
 * 报销事项详情页面属性
 */
interface ItemDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 报销事项详情页面
 * 
 * 显示报销事项详情、发票列表、金额汇总，
 * 支持上传发票、编辑和删除，响应式布局
 * 
 * 验证需求: 7.2, 7.3, 7.4, 16.1, 16.2, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
 */
export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <ReimbursementDetail itemId={id} />
      </div>
    </main>
  );
}