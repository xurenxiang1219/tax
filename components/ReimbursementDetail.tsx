'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Save, X, Receipt, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useReimbursementStore } from '@/store/reimbursement-store';
import { AmountSummary } from '@/components/AmountSummary';
import { InvoiceList } from '@/components/InvoiceList';
import { InvoiceUploader } from '@/components/InvoiceUploader';

/**
 * 报销事项详情组件属性
 */
interface ReimbursementDetailProps {
  /** 报销事项 ID */
  itemId: string;
}

/**
 * 编辑表单数据
 */
interface EditForm {
  title: string;
  notes: string;
}

/**
 * 报销事项详情组件
 * 
 * 显示报销事项详细信息，支持编辑标题和备注，
 * 显示发票列表和金额汇总
 */
export function ReimbursementDetail({ itemId }: ReimbursementDetailProps) {
  const router = useRouter();
  const currentItem = useReimbursementStore((state) => state.currentItem);
  const loading = useReimbursementStore((state) => state.loading);
  const error = useReimbursementStore((state) => state.error);
  const setCurrentItem = useReimbursementStore((state) => state.setCurrentItem);
  const setLoading = useReimbursementStore((state) => state.setLoading);
  const setError = useReimbursementStore((state) => state.setError);
  const updateItem = useReimbursementStore((state) => state.updateItem);
  
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', notes: '' });
  const [saving, setSaving] = useState(false);

  // 加载报销事项详情
  useEffect(() => {
    async function loadItemDetail() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/items/${itemId}`);
        if (!response.ok) {
          const errorMessage = response.status === 404 ? '报销事项不存在' : '加载报销事项详情失败';
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        setCurrentItem(data);
        setEditForm({
          title: data.title,
          notes: data.notes || '',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '加载失败';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadItemDetail();
  }, [itemId, setCurrentItem, setLoading, setError]);

  /**
   * 开始编辑报销事项
   */
  const handleStartEdit = () => {
    if (!currentItem) return;
    
    setEditForm({
      title: currentItem.title,
      notes: currentItem.notes || '',
    });
    setEditing(true);
  };

  /**
   * 取消编辑并恢复原始数据
   */
  const handleCancelEdit = () => {
    setEditing(false);
    if (currentItem) {
      setEditForm({
        title: currentItem.title,
        notes: currentItem.notes || '',
      });
    }
  };

  /**
   * 保存编辑的报销事项信息
   */
  const handleSaveEdit = async () => {
    if (!currentItem || !editForm.title.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title.trim(),
          notes: editForm.notes.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('更新报销事项失败');
      }

      const updatedItem = await response.json();
      updateItem(itemId, updatedItem);
      setCurrentItem(updatedItem);
      setEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 计算金额汇总
   * @returns 汇总数据（总金额和按分类的金额）
   * 
   * 遍历所有发票，累加总金额和各分类金额
   */
  const calculateSummary = () => {
    const emptyCategory = {
      transportation: 0,
      meals: 0,
      accommodation: 0,
      office: 0,
      other: 0,
    };

    if (!currentItem?.invoices || currentItem.invoices.length === 0) {
      return {
        total: 0,
        byCategory: emptyCategory,
      };
    }

    const summary = {
      total: 0,
      byCategory: { ...emptyCategory },
    };

    currentItem.invoices.forEach((invoice) => {
      const amount = invoice.amount || 0;
      summary.total += amount;
      summary.byCategory[invoice.category] += amount;
    });

    return summary;
  };

  /**
   * 渲染加载状态
   */
  const renderLoading = () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      <span className="ml-3 text-gray-600">加载中...</span>
    </div>
  );

  if (loading || !currentItem) {
    return renderLoading();
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const summary = calculateSummary();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
          className="h-8 -ml-2"
        >
          <ChevronLeft size={16} className="mr-1" />
          返回列表
        </Button>
        {!editing && (
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => router.push(`/voucher/${itemId}`)}
              size="sm"
            >
              <Receipt size={14} className="mr-1.5" />
              支付证明单
            </Button>
            <Button onClick={handleStartEdit} size="sm">
              <Edit size={14} className="mr-1.5" />
              编辑
            </Button>
          </div>
        )}
      </div>

      <Card className="border-l-2 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="edit-title" className="text-sm">标题 *</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="请输入报销事项标题"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-notes" className="text-sm">备注</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="选填"
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  size="sm"
                >
                  <X size={14} className="mr-1.5" />
                  取消
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={!editForm.title.trim() || saving}
                  size="sm"
                >
                  <Save size={14} className="mr-1.5" />
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-xs text-gray-500">标题</Label>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{currentItem.title}</p>
              </div>
              {currentItem.notes && (
                <div>
                  <Label className="text-xs text-gray-500">备注</Label>
                  <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{currentItem.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t text-xs">
                <div>
                  <Label className="text-gray-500">创建时间</Label>
                  <p className="text-gray-900 mt-0.5">
                    {new Date(currentItem.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">更新时间</Label>
                  <p className="text-gray-900 mt-0.5">
                    {new Date(currentItem.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AmountSummary total={summary.total} byCategory={summary.byCategory} />
      <InvoiceUploader itemId={itemId} />
      <InvoiceList invoices={currentItem.invoices || []} />
    </div>
  );
}