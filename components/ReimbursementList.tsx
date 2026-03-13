'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, AlertTriangle } from 'lucide-react';
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

  // 加载报销事项列表
  useEffect(() => {
    loadItems();
  }, []);

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
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      {/* 创建按钮 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">报销事项</h2>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center"
        >
          <Plus size={20} className="mr-2" />
          新建报销事项
        </Button>
      </div>

      {/* 创建表单 */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>创建新报销事项</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">标题 *</Label>
                <Input
                  id="title"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="请输入报销事项标题"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <Textarea
                  id="notes"
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  rows={3}
                  placeholder="请输入备注信息（可选）"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit">
                  创建
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 报销事项列表 */}
      {showCreateForm ? null : items.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无报销事项</h3>
          <p className="text-gray-600 mb-4">点击上方按钮创建您的第一个报销事项</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      <a
                        href={`/items/${item.id}`}
                        className="hover:text-blue-600 transition-colors duration-200"
                      >
                        {item.title}
                      </a>
                    </h3>
                    {item.notes && (
                      <p className="text-gray-600 mb-3">{item.notes}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>发票数量: {item.invoiceCount || 0}</span>
                      <span>总金额: ¥{(item.totalAmount || 0).toFixed(2)}</span>
                      <span>创建时间: {new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={deletingItemId === item.id}
                      >
                        <Trash2 size={20} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="text-red-600" size={20} />
                          确认删除报销事项
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          您确定要删除报销事项 "{item.title}" 吗？此操作将同时删除所有关联的发票，且无法撤销。
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
      )}
    </div>
  );
}