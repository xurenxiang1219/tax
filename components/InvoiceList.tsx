'use client';

import { useState } from 'react';
import { FileText, Image, Trash2, Edit, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { type Invoice, type InvoiceCategory } from '@/store/reimbursement-store';
import { useReimbursementStore } from '@/store/reimbursement-store';

/**
 * 发票列表组件属性
 */
interface InvoiceListProps {
  /** 发票列表 */
  invoices: Invoice[];
  /** 是否显示加载状态 */
  loading?: boolean;
}

/**
 * 分类配置
 */
const CATEGORY_CONFIG = {
  transportation: { label: '交通费', color: 'bg-blue-100 text-blue-800' },
  meals: { label: '餐饮费', color: 'bg-orange-100 text-orange-800' },
  accommodation: { label: '住宿费', color: 'bg-purple-100 text-purple-800' },
  office: { label: '办公用品', color: 'bg-green-100 text-green-800' },
  other: { label: '其他', color: 'bg-gray-100 text-gray-800' },
};

/**
 * 发票编辑表单组件
 */
interface InvoiceEditFormProps {
  invoice: Invoice;
  onSave: (updates: Partial<Invoice>) => Promise<void>;
  onCancel: () => void;
}

function InvoiceEditForm({ invoice, onSave, onCancel }: InvoiceEditFormProps) {
  const [amount, setAmount] = useState(invoice.amount?.toString() || '');
  const [category, setCategory] = useState<InvoiceCategory>(invoice.category);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 验证金额格式
   * @param amountStr - 金额字符串
   * @returns 解析后的金额，或 null 如果为空
   * @throws 如果金额格式无效
   */
  const validateAmount = (amountStr: string): number | null => {
    if (!amountStr.trim()) return null;
    
    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      throw new Error('请输入有效的金额（非负数）');
    }
    
    const decimalPart = amountStr.split('.')[1];
    if (decimalPart && decimalPart.length > 2) {
      throw new Error('金额最多保留两位小数');
    }
    
    return parsedAmount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const parsedAmount = validateAmount(amount);
      await onSave({ amount: parsedAmount, category });
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="amount">金额</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="请输入金额"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">分类</Label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as InvoiceCategory)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSubmitting}
        >
          <option value="transportation">交通费</option>
          <option value="meals">餐饮费</option>
          <option value="accommodation">住宿费</option>
          <option value="office">办公用品</option>
          <option value="other">其他</option>
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </form>
  );
}

/**
 * 发票卡片组件
 */
interface InvoiceCardProps {
  invoice: Invoice;
  onUpdate: (updates: Partial<Invoice>) => Promise<void>;
  onDelete: () => Promise<void>;
  onPreview: () => void;
}

function InvoiceCard({ invoice, onUpdate, onDelete, onPreview }: InvoiceCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[invoice.category];
  const isImage = invoice.fileType.startsWith('image/');
  const isPDF = invoice.fileType === 'application/pdf';

  /**
   * 获取文件图标
   */
  const getFileIcon = () => {
    if (isImage) return <Image size={20} className="text-green-600" />;
    if (isPDF) return <FileText size={20} className="text-red-600" />;
    return <FileText size={20} className="text-gray-600" />;
  };

  /**
   * 渲染 OCR 状态标签
   */
  const renderOCRStatus = () => {
    const statusConfig = {
      processing: { variant: 'secondary' as const, text: '识别中...', className: '' },
      failed: { variant: 'destructive' as const, text: '识别失败', className: '' },
      success: { variant: 'default' as const, text: '已识别', className: 'bg-green-100 text-green-800' },
      pending: { variant: 'secondary' as const, text: '待识别', className: '' },
    };

    const config = statusConfig[invoice.ocrStatus as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className={`text-xs ${config.className}`}>
        {config.text}
      </Badge>
    );
  };

  /**
   * 处理编辑保存
   */
  const handleEditSave = async (updates: Partial<Invoice>) => {
    try {
      await onUpdate(updates);
      setIsEditing(false);
    } catch {
      // 错误已在 InvoiceEditForm 中处理
    }
  };

  /**
   * 处理删除发票
   */
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * 判断是否需要显示重新识别按钮
   */
  const shouldShowReprocessButton = invoice.ocrStatus === 'failed' || invoice.ocrStatus === 'pending';

  /**
   * 处理重新识别发票
   */
  const handleReprocess = async () => {
    setIsReprocessing(true);
    try {
      const response = await fetch(`/api/items/${invoice.reimbursementItemId}/invoices`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });

      if (!response.ok) {
        throw new Error('重新识别失败');
      }

      const updatedInvoice = await response.json();
      await onUpdate(updatedInvoice);
    } catch (error) {
      console.error('重新识别发票失败:', error);
    } finally {
      setIsReprocessing(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* 文件图标 */}
          <div className="flex-shrink-0 mt-1">
            {getFileIcon()}
          </div>

          {/* 文件信息 */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate mb-2" title={invoice.fileName}>
              {invoice.fileName}
            </h4>

            <div className="flex items-center gap-2 mb-2">
              <Badge className={categoryConfig.color}>
                {categoryConfig.label}
              </Badge>
              {renderOCRStatus()}
            </div>

            <div className="text-sm text-gray-600 mb-2">
              <div>金额: {invoice.amount ? `¥${invoice.amount.toFixed(2)}` : '未识别'}</div>
              <div>大小: {(invoice.fileSize / 1024 / 1024).toFixed(2)} MB</div>
            </div>

            <div className="text-xs text-gray-500">
              上传时间: {new Date(invoice.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1">
            {/* 预览按钮 */}
            <Button
              size="sm"
              variant="ghost"
              onClick={onPreview}
              title="预览发票"
            >
              <Eye size={16} />
            </Button>

            {/* 重新识别按钮 - 仅在识别失败或待识别时显示 */}
            {shouldShowReprocessButton && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReprocess}
                disabled={isReprocessing}
                title="重新识别"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <RefreshCw size={16} className={isReprocessing ? 'animate-spin' : ''} />
              </Button>
            )}

            {/* 编辑按钮 */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  title="编辑发票"
                >
                  <Edit size={16} />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>编辑发票信息</DialogTitle>
                </DialogHeader>
                <InvoiceEditForm
                  invoice={invoice}
                  onSave={handleEditSave}
                  onCancel={() => setIsEditing(false)}
                />
              </DialogContent>
            </Dialog>

            {/* 删除按钮 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="删除发票"
                  disabled={isDeleting}
                >
                  <Trash2 size={16} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-red-600" size={20} />
                    确认删除发票
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    您确定要删除发票 "{invoice.fileName}" 吗？此操作无法撤销，发票文件也将被永久删除。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isDeleting}
                  >
                    {isDeleting ? '删除中...' : '确认删除'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 使用发票操作的 store 方法
 * 
 * 注意：不能使用对象解构模式 `(state) => ({ ... })`，
 * 因为每次渲染都会创建新对象，导致 Zustand 认为状态改变，触发无限循环
 */
function useInvoiceActions() {
  const updateInvoice = useReimbursementStore((state) => state.updateInvoice);
  const removeInvoice = useReimbursementStore((state) => state.removeInvoice);
  return { updateInvoice, removeInvoice };
}

/**
 * 发票列表组件
 * 
 * 显示发票列表，支持编辑发票金额和分类、删除发票、预览发票
 * 验证需求: 9.1, 9.2, 10.1, 11.1
 */
export function InvoiceList({
  invoices,
  loading = false,
}: InvoiceListProps) {
  const { updateInvoice, removeInvoice } = useInvoiceActions();

  /**
   * 发送 API 请求
   * @param id - 发票 ID
   * @param method - HTTP 方法
   * @param body - 请求体（可选）
   * @returns 响应数据
   */
  const invoiceApiCall = async (
    id: string,
    method: 'PUT' | 'DELETE',
    body?: Partial<Invoice>
  ) => {
    const response = await fetch(`/api/invoices/${id}`, {
      method,
      ...(body && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    });

    if (!response.ok) {
      throw new Error(method === 'PUT' ? '更新发票失败' : '删除发票失败');
    }

    return method === 'DELETE' ? null : response.json();
  };

  /**
   * 处理发票更新
   * @param id - 发票 ID
   * @param updates - 更新的字段
   */
  const handleUpdateInvoice = async (id: string, updates: Partial<Invoice>) => {
    try {
      const updatedInvoice = await invoiceApiCall(id, 'PUT', updates);
      updateInvoice(id, updatedInvoice);
    } catch (error) {
      console.error('更新发票失败:', error);
      throw error;
    }
  };

  /**
   * 处理发票删除
   * @param id - 发票 ID
   */
  const handleDeleteInvoice = async (id: string) => {
    try {
      await invoiceApiCall(id, 'DELETE');
      removeInvoice(id);
    } catch (error) {
      console.error('删除发票失败:', error);
      throw error;
    }
  };

  /**
   * 处理发票预览
   * @param id - 发票 ID
   */
  const handlePreviewInvoice = (id: string) => {
    window.open(`/api/invoices/${id}/preview`, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>发票列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">发票列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FileText size={48} className="mb-3 text-gray-300" />
            <p className="text-sm">暂无发票，请先上传</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-2 border-l-purple-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>发票列表</span>
          <Badge variant="secondary" className="text-xs">{invoices.length} 张</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onUpdate={(updates) => handleUpdateInvoice(invoice.id, updates)}
              onDelete={() => handleDeleteInvoice(invoice.id)}
              onPreview={() => handlePreviewInvoice(invoice.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}