'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Save, X, Receipt } from 'lucide-react';
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">报销事项详情</h2>
            <p className="text-gray-600 mt-1">查看和管理发票信息</p>
          </div>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const summary = calculateSummary();

  return (
    <div className="space-y-6">
      {/* 头部操作区 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">报销事项详情</h2>
            <p className="text-gray-600 mt-1">查看和管理发票信息</p>
          </div>
        </div>
        
        {!editing && (
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => router.push(`/voucher/${itemId}`)}
            >
              <Receipt size={16} className="mr-2" />
              支付证明单
            </Button>
            <Button onClick={handleStartEdit}>
              <Edit size={16} className="mr-2" />
              编辑
            </Button>
          </div>
        )}
      </div>

      {/* 基本信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-title">标题 *</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="请输入报销事项标题"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">备注</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="请输入备注信息（可选）"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  <X size={16} className="mr-2" />
                  取消
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={!editForm.title.trim() || saving}
                >
                  <Save size={16} className="mr-2" />
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>标题</Label>
                <p className="text-gray-900 mt-1">{currentItem.title}</p>
              </div>
              {currentItem.notes && (
                <div>
                  <Label>备注</Label>
                  <p className="text-gray-900 mt-1 whitespace-pre-wrap">{currentItem.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <Label>创建时间</Label>
                  <p className="text-gray-900 mt-1">
                    {new Date(currentItem.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div>
                  <Label>更新时间</Label>
                  <p className="text-gray-900 mt-1">
                    {new Date(currentItem.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 金额汇总 */}
      <AmountSummary total={summary.total} byCategory={summary.byCategory} />

      {/* 发票上传 */}
      <InvoiceUploader itemId={itemId} />

      {/* 发票列表 */}
      <InvoiceList invoices={currentItem.invoices || []} />
    </div>
  );
}