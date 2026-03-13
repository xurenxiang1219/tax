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
  const isZero = amount === 0;
  
  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
      <Badge 
        className={`${config.bgColor} ${config.color} ${isZero ? 'opacity-50' : ''} text-xs`}
      >
        {config.label}
      </Badge>
      <span className={`font-medium ${isZero ? 'text-gray-400' : 'text-gray-900'}`}>
        {formatAmount(amount)}
      </span>
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
    <Card className="border-l-2 border-l-green-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>金额汇总</span>
          {hasAnyAmount && (
            <Badge variant="secondary" className="text-xs">{categoriesWithAmount} 个分类</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">总金额</span>
            <span className="text-xl font-bold text-blue-900">{formatAmount(total)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">分类明细</h4>
          {!hasAnyAmount ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt size={40} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">暂无发票金额</p>
            </div>
          ) : (
            <div className="space-y-1.5">
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
      </CardContent>
    </Card>
  );
}