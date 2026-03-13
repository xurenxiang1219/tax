'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, AlertTriangle, Receipt, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useReimbursementStore } from '@/store/reimbursement-store';

/**
 * 报销事项列表组件
 * 
 * 显示报销事项列表，支持创建新报销事项和删除操作
 */
export function ReimbursementList() {
  const { items, loading, error, setItems, setLoading, setError, addItem, removeItem } = useReimbursementStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/items');
      if (!response.ok) throw new Error('获取报销事项列表失败');
      
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : '获取报销事项列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载报销事项列表
  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setShowCreateForm(false);
    setNewItemTitle('');
    setNewItemNotes('');
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItemTitle.trim()) return;

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newItemTitle.trim(),
          notes: newItemNotes.trim() || null,
        }),
      });

      if (!response.ok) throw new Error('创建报销事项失败');

      const newItem = await response.json();
      addItem(newItem);
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : '创建报销事项失败');
    }
  };

  const handleDeleteItem = async (id: string) => {
    setDeletingItemId(id);
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除报销事项失败');

      removeItem(id);
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除报销事项失败');
    } finally {
      setDeletingItemId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">报销事项</h2>
          <p className="text-sm text-gray-500 mt-0.5">管理您的报销申请</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} size="sm">
          <Plus size={16} className="mr-1.5" />
          新建
        </Button>
      </div>

      {showCreateForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">新建报销事项</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateItem} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm">标题 *</Label>
                <Input
                  id="title"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="例如：2026年3月差旅报销"
                  required
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm">备注</Label>
                <Textarea
                  id="notes"
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  rows={2}
                  placeholder="选填"
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm">创建</Button>
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showCreateForm && (
        items.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-4">暂无报销事项</p>
              <Button onClick={() => setShowCreateForm(true)} size="sm">
                <Plus size={16} className="mr-1.5" />
                创建第一个
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        <a href={`/items/${item.id}`} className="hover:text-blue-600 transition-colors">
                          {item.title}
                        </a>
                      </h3>
                      {item.notes && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.notes}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <Receipt size={16} className="text-blue-500" />
                          <span className="font-medium">{item.invoiceCount || 0}</span> 张发票
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <Calculator size={16} className="text-green-500" />
                          <span className="font-medium">¥{(item.totalAmount || 0).toFixed(2)}</span>
                        </span>
                        <span className="text-gray-500 text-xs">
                          {new Date(item.createdAt).toLocaleDateString('zh-CN', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0"
                          disabled={deletingItemId === item.id}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="text-red-600" size={20} />
                            确认删除
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除 "{item.title}" 吗？此操作将同时删除所有关联的发票，且无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteItem(item.id)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deletingItemId === item.id}
                          >
                            {deletingItemId === item.id ? '删除中...' : '确认删除'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}