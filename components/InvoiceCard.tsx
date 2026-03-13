'use client';

import { useState } from 'react';
import { FileText, Image, Trash2, Edit, Eye } from 'lucide-react';
import { type Invoice, type InvoiceCategory } from '@/store/reimbursement-store';

interface InvoiceCardProps {
  invoice: Invoice;
  onUpdate?: (id: string, updates: Partial<Invoice>) => void;
  onDelete?: (id: string) => void;
  onPreview?: (id: string) => void;
}

const CATEGORY_CONFIG = {
  transportation: { label: '交通费', color: 'bg-blue-100 text-blue-800' },
  meals: { label: '餐饮费', color: 'bg-orange-100 text-orange-800' },
  accommodation: { label: '住宿费', color: 'bg-purple-100 text-purple-800' },
  office: { label: '办公用品', color: 'bg-green-100 text-green-800' },
  other: { label: '其他', color: 'bg-gray-100 text-gray-800' },
};

/**
 * 发票卡片组件
 */
export function InvoiceCard({ invoice, onUpdate, onDelete, onPreview }: InvoiceCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(invoice.amount?.toString() || '');
  const [editCategory, setEditCategory] = useState(invoice.category);

  const categoryConfig = CATEGORY_CONFIG[invoice.category];
  const isImage = invoice.fileType.startsWith('image/');
  const isPDF = invoice.fileType === 'application/pdf';

  const getFileIcon = () => {
    if (isImage) return <Image size={24} className="text-green-600" />;
    if (isPDF) return <FileText size={24} className="text-red-600" />;
    return <FileText size={24} className="text-gray-600" />;
  };

  const renderOCRStatus = () => {
    if (invoice.ocrStatus === 'processing') {
      return <span className="text-xs text-blue-600">识别中...</span>;
    }
    if (invoice.ocrStatus === 'failed') {
      return <span className="text-xs text-red-600">识别失败</span>;
    }
    return null;
  };

  const handleSave = () => {
    if (editAmount) {
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount < 0) {
        alert('请输入有效的金额');
        return;
      }
    }

    onUpdate?.(invoice.id, {
      amount: editAmount ? parseFloat(editAmount) : null,
      category: editCategory,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditAmount(invoice.amount?.toString() || '');
    setEditCategory(invoice.category);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-md shadow p-4 border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getFileIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate" title={invoice.fileName}>
            {invoice.fileName}
          </h4>
          
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryConfig.color}`}>
              {categoryConfig.label}
            </span>
            {renderOCRStatus()}
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="金额"
                />
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as InvoiceCategory)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="transportation">交通费</option>
                  <option value="meals">餐饮费</option>
                  <option value="accommodation">住宿费</option>
                  <option value="office">办公用品</option>
                  <option value="other">其他</option>
                </select>
              </div>
            ) : (
              <div>
                金额: {invoice.amount ? `¥${invoice.amount.toFixed(2)}` : '未识别'}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="保存"
              >
                ✓
              </button>
              <button
                onClick={handleCancel}
                className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                title="取消"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onPreview?.(invoice.id)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                title="预览"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                title="编辑"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => onDelete?.(invoice.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="删除"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}