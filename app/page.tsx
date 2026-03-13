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
      {/* 页面头部 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                发票报销预审批系统
              </h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">
                智能发票识别，自动分类汇总，简化报销流程
              </p>
            </div>
            
            {/* 系统状态指示器（可选） */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">系统正常</span>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* 报销事项列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <ReimbursementList />
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2026 发票报销预审批系统. 基于 Next.js 16 构建</p>
          </div>
        </div>
      </footer>
    </div>
  );
}