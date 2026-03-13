'use client';

import { Calculator, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type InvoiceCategory } from '@/store/reimbursement-store';

/**
 * 分类汇总数据
 */
export interface CategorySummary {
  transportation: number;
  meals: number;
  accommodation: number;
  office: number;
  other: number;
}

/**
 * 金额汇总组件属性
 */
interface AmountSummaryProps {
  /** 总金额 */
  total: number;
  /** 按分类汇总的金额 */
  byCategory: CategorySummary;
  /** 是否显示加载状态 */
  loading?: boolean;
}

/**
 * 分类配置 - 使用设计系统规范中的分类颜色
 */
const CATEGORY_CONFIG: Record<InvoiceCategory, { 
  label: string; 
  color: string; 
  bgColor: string;
}> = {
  transportation: { 
    label: '交通费', 
    color: 'text-blue-800', 
    bgColor: 'bg-blue-100'
  },
  meals: { 
    label: '餐饮费', 
    color: 'text-orange-800', 
    bgColor: 'bg-orange-100'
  },
  accommodation: { 
    label: '住宿费', 
    color: 'text-purple-800', 
    bgColor: 'bg-purple-100'
  },
  office: { 
    label: '办公用品', 
    color: 'text-green-800', 
    bgColor: 'bg-green-100'
  },
  other: { 
    label: '其他', 
    color: 'text-gray-800', 
    bgColor: 'bg-gray-100'
  },
};

/**
 * 格式化金额显示
 * @param amount - 金额数值
 * @returns 格式化的金额字符串
 */
function formatAmount(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

/**
 * 分类汇总项组件
 */
interface CategoryItemProps {
  category: InvoiceCategory;
  amount: number;
}

function CategoryItem({ category, amount }: CategoryItemProps) {
  const config = CATEGORY_CONFIG[category];
  
  // 如果金额为 0，使用较淡的样式
  const isZero = amount === 0;
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <Badge 
          className={`${config.bgColor} ${config.color} ${isZero ? 'opacity-50' : ''}`}
        >
          {config.label}
        </Badge>
      </div>
      <div className={`font-medium ${isZero ? 'text-gray-400' : 'text-gray-900'}`}>
        {formatAmount(amount)}
      </div>
    </div>
  );
}

/**
 * 金额汇总组件
 * 
 * 显示总金额和分类汇总，使用分类颜色
 * 验证需求: 5.1, 5.2, 5.4
 */
export function AmountSummary({ total, byCategory, loading = false }: AmountSummaryProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator size={20} />
            金额汇总
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600">计算中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 计算有金额的分类数量
  const categoriesWithAmount = Object.values(byCategory).filter(amount => amount > 0).length;
  const hasAnyAmount = total > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={20} />
            金额汇总
          </div>
          {hasAnyAmount && (
            <Badge variant="secondary" className="text-xs">
              {categoriesWithAmount} 个分类
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 总金额显示 */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={20} className="text-blue-600" />
              <span className="text-lg font-semibold text-blue-900">总金额</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {formatAmount(total)}
            </div>
          </div>
        </div>

        {/* 分类汇总 */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 text-sm">分类明细</h4>
          
          {!hasAnyAmount ? (
            <div className="text-center py-6 text-gray-500">
              <Receipt size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">暂无发票金额</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(Object.keys(byCategory) as InvoiceCategory[]).map((category) => (
                <CategoryItem
                  key={category}
                  category={category}
                  amount={byCategory[category]}
                />
              ))}
            </div>
          )}
        </div>

        {/* 汇总验证 - 开发环境下显示，用于验证分类汇总之和等于总金额 */}
        {process.env.NODE_ENV === 'development' && hasAnyAmount && (
          <div className="pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>分类汇总:</span>
                <span>
                  {formatAmount(
                    Object.values(byCategory).reduce((sum, amount) => sum + amount, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>总金额:</span>
                <span>{formatAmount(total)}</span>
              </div>
              {Math.abs(total - Object.values(byCategory).reduce((sum, amount) => sum + amount, 0)) > 0.01 && (
                <div className="text-red-500 text-xs">
                  ⚠️ 金额不匹配，请检查计算逻辑
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}