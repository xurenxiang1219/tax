'use client';

import { use } from 'react';
import { PaymentVoucher } from '@/components/PaymentVoucher';

/**
 * 支付证明单页面属性
 */
interface VoucherPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 支付证明单页面
 * 
 * 显示支付证明单，支持编辑和打印功能
 */
export default function VoucherPage({ params }: VoucherPageProps) {
  const { id } = use(params);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PaymentVoucher itemId={id} />
      </div>
    </main>
  );
}