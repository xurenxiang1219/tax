'use client';

import { useState, useEffect } from 'react';
import { recognizeFile, type OCRResult } from '@/lib/ocr';
import { classifyInvoice } from '@/lib/classifier';

/**
 * OCR 处理器属性
 */
interface OCRProcessorProps {
  /** 发票 ID */
  invoiceId: string;
  /** 发票文件 */
  file: File;
  /** OCR 完成回调 */
  onComplete?: (result: { amount?: number; category?: string; ocrText?: string }) => void;
  /** OCR 失败回调 */
  onError?: (error: string) => void;
}

/**
 * 状态图标组件
 */
function StatusIcon({ type }: { type: 'success' | 'error' }) {
  if (type === 'success') {
    return (
      <svg className="h-5 w-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  return (
    <svg className="h-5 w-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * OCR 处理组件
 * 
 * 在客户端触发 OCR 识别，显示识别进度，
 * 识别成功后自动分类并更新发票信息
 */
export function OCRProcessor({ invoiceId, file, onComplete, onError }: OCRProcessorProps) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);

  useEffect(() => {
    let isMounted = true;
    let progressInterval: NodeJS.Timeout;

    async function processOCR() {
      if (status !== 'idle') return;

      setStatus('processing');
      setProgress(0);

      try {
        // 模拟进度更新
        progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 10, 90));
        }, 1000);

        const ocrResult = await recognizeFile(file);

        clearInterval(progressInterval);
        setProgress(100);

        if (!isMounted) return;

        setResult(ocrResult);

        if (ocrResult.success) {
          setStatus('success');

          // 构建更新数据
          const category = ocrResult.text ? classifyInvoice(ocrResult.text) : 'other';
          const updateData = {
            category,
            ...(ocrResult.amount && { amount: ocrResult.amount }),
            ...(ocrResult.text && { ocrText: ocrResult.text }),
          };

          // 调用 API 更新发票
          try {
            const response = await fetch(`/api/invoices/${invoiceId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData),
            });

            if (!response.ok) throw new Error('更新发票失败');

            onComplete?.(updateData);
          } catch (error) {
            console.error('更新发票失败:', error);
            onError?.('更新发票失败');
          }
        } else {
          setStatus('error');
          onError?.(ocrResult.error || 'OCR 识别失败');
        }
      } catch (error) {
        if (!isMounted) return;
        
        setStatus('error');
        const errorMessage = error instanceof Error ? error.message : 'OCR 处理失败';
        onError?.(errorMessage);
      }
    }

    processOCR();

    return () => {
      isMounted = false;
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [invoiceId, file, status, onComplete, onError]);

  // 处理中状态
  if (status === 'idle' || status === 'processing') {
    return (
      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
        <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
        <div className="flex-1">
          <p className="text-sm font-medium">正在识别发票...</p>
          <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 成功状态
  if (status === 'success') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
        <div className="flex items-start gap-3">
          <StatusIcon type="success" />
          <div className="flex-1">
            <p className="text-sm font-medium">识别成功</p>
            {result?.amount && (
              <p className="text-sm mt-1">识别金额：¥{result.amount.toFixed(2)}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (status === 'error') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        <div className="flex items-start gap-3">
          <StatusIcon type="error" />
          <div className="flex-1">
            <p className="text-sm font-medium">识别失败</p>
            <p className="text-sm mt-1">{result?.error || '请手动输入金额'}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
