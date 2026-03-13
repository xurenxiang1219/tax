import { ReimbursementList } from '@/components/ReimbursementList';

/**
 * 首页组件
 * 
 * 显示报销事项列表，支持创建新报销事项，使用响应式布局
 * 
 * 功能特性：
 * - 显示报销事项列表
 * - 支持创建新报销事项
 * - 响应式设计，适配移动端和桌面端
 * - 遵循设计系统规范
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <h1 className="text-lg font-semibold text-gray-900">发票报销预审批系统</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <ReimbursementList />
      </main>
    </div>
  );
}