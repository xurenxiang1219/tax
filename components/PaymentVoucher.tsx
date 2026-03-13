'use client';

import { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 支付证明单数据接口
 */
interface PaymentVoucherData {
  id: string;
  reimbursementItemId: string;
  date: string;
  department: string;
  paymentMethod: string;
  payeeName: string;
  bankName: string;
  bankAccount: string;
  summary: {
    transportation: number;
    meals: number;
    accommodation: number;
    office: number;
    other: number;
  };
  subtotal: number;
  tax: number;
  total: number;
  totalInChinese: string;
  approvals: Record<string, any>;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 支付证明单组件属性
 */
interface PaymentVoucherProps {
  itemId: string;
}

/**
 * 样式常量
 */
const STYLES = {
  // 下划线输入框
  underlineInput: {
    borderBottom: '1px solid black',
    display: 'inline-block' as const,
    paddingBottom: '2px'
  },
  // 表格单元格
  tableCell: {
    border: '1px solid black',
    padding: '5px'
  },
  // 小字体
  smallText: {
    fontSize: '11px'
  },
  // 超小字体
  tinyText: {
    fontSize: '10px'
  },
  // 微小字体
  microText: {
    fontSize: '9px'
  }
} as const;

/**
 * 支付证明单组件
 * 
 * 完全按照标准财务支付证明单格式设计，支持打印
 * 
 * @param props - 组件属性
 * @param props.itemId - 报销事项 ID
 */
export function PaymentVoucher({ itemId }: PaymentVoucherProps) {
  const [voucher, setVoucher] = useState<PaymentVoucherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVoucher() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/voucher/${itemId}`);
        if (!response.ok) throw new Error('加载支付证明单失败');
        
        const data = await response.json();
        setVoucher(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }

    loadVoucher();
  }, [itemId]);

  /**
   * 打印支付证明单
   */
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        <p className="text-sm">{error || '支付证明单不存在'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3 no-print">
        <Button variant="outline" onClick={handlePrint}>
          <Printer size={16} className="mr-2" />
          打印
        </Button>
      </div>

      <div className="payment-voucher bg-white" style={{ 
        width: '210mm',
        margin: '0 auto',
        padding: '10mm',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        fontFamily: 'SimSun, "宋体", serif',
        fontSize: '14px',
        color: '#000',
      }}>
        {/* 标题 - 双下划线 */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 'bold',
            letterSpacing: '20px',
            marginBottom: '5px',
            paddingLeft: '20px'
          }}>
            支 付 证 明 单
          </h1>
          <div style={{ 
            width: '50%',
            margin: '0 auto',
            position: 'relative'
          }}>
            <div style={{ 
              borderBottom: '2px solid black',
              marginBottom: '2px'
            }}></div>
            <div style={{ 
              borderBottom: '1px solid black'
            }}></div>
          </div>
        </div>

        {/* 第一行：日期和财务编号 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', ...STYLES.smallText }}>
          <div >
            <span style={{ fontWeight: 'bold' }}>日期：&nbsp;&nbsp;&nbsp;&nbsp;</span>
            <span style={{ fontWeight: 'bold' }}>{formatDate(voucher.date) || '2026 年 3 月 1 日'}</span>
          </div>
          <div>
            <span>财务 第</span>
            <span style={{ 
              ...STYLES.underlineInput,
              width: '50px',
              marginLeft: '5px',
              marginRight: '5px'
            }}></span>
            <span>号</span>
          </div>
        </div>

        {/* 第二行：申请部门和附件张数 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', ...STYLES.smallText }}>
          <div>
            <span style={{ fontWeight: 'bold' }}>申请部门/分行：</span>
            <span style={{ 
              ...STYLES.underlineInput,
              minWidth: '150px',
              marginLeft: '5px',
            }}>
              {voucher.department}&nbsp;
            </span>
          </div>
          <div>
            <span style={{ fontWeight: 'bold',marginRight:70}}>附件张数：</span>
          </div>
        </div>

        {/* 第三行：付款方式 */}
        <div style={{ marginBottom: '5px', ...STYLES.smallText }}>
          <span style={{ fontWeight: 'bold' }}>付款方式：</span>
          <span style={{ marginLeft: '15px' }}>
            {renderCheckbox('现金', voucher.paymentMethod === 'cash')}
            {renderCheckbox('支 票', voucher.paymentMethod === 'check')}
            {renderCheckbox('银行转账', voucher.paymentMethod === 'bank_transfer', '0px')}
          </span>
        </div>

        {/* 第四行：收款人信息 - 平分宽度 */}
        <div style={{ marginBottom: '8px', ...STYLES.smallText, display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          {renderUnderlineField('收款人：', voucher.payeeName)}
          {renderUnderlineField('开户银行：', voucher.bankName)}
          {renderUnderlineField('银行账号：', voucher.bankAccount)}
        </div>

        {/* 主表格 - 摘要和申请金额分开 */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          border: '1px solid black',
          ...STYLES.tinyText
        }}>
          <thead>
            <tr>
              <th style={{ 
                ...STYLES.tableCell,
                textAlign: 'center',
                width: '50%'
              }} rowSpan={2}>
                摘 要
              </th>
              <th style={{ 
                ...STYLES.tableCell,
                textAlign: 'center',
               
              }} colSpan={9}>
                申请金额
              </th>
              <th style={{ 
                ...STYLES.tableCell,
                textAlign: 'center',
                width: '35%'
              }} rowSpan={2}>
                备注
              </th>
            </tr>
            <tr>
              {['百万', '十万', '万', '千', '百', '十', '元', '角', '分'].map((unit) => (
                <th key={unit} style={{ 
                  ...STYLES.tableCell,
                  padding: "0 6px", 
                  textAlign: 'center', 
                  ...STYLES.microText,
                  whiteSpace: 'nowrap',
                }}>
                  {unit}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 动态显示有金额的分类行 */}
            {Object.entries(voucher.summary).map(([category, amount]) => {
              if (amount === 0) return null;
              
              const categoryLabel: Record<string, string> = {
                transportation: '交通',
                meals: '餐饮',
                accommodation: '住宿',
                office: '办公用品',
                other: '其他',
              };
              
              return (
                <tr key={category}>
                  <td style={{ ...STYLES.tableCell, textAlign: 'center' }}>
                    {categoryLabel[category]}
                  </td>
                  {renderAmountCells(amount)}
                  <td style={STYLES.tableCell} rowSpan={8}></td>
                </tr>
              );
            })}
            
            {/* 空行补齐到5行 */}
            {Array(5 - Object.values(voucher.summary).filter(v => v > 0).length).fill(0).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td style={{ ...STYLES.tableCell, height: '22px' }}></td>
                {Array(9).fill(0).map((_, j) => (
                  <td key={j} style={STYLES.tableCell}></td>
                ))}
              </tr>
            ))}
            
            <tr>
              <td style={{ ...STYLES.tableCell, textAlign: 'right', paddingRight: '10px' }}>小计：</td>
              {renderAmountCells(voucher.subtotal)}
            </tr>
            <tr>
              <td style={{ ...STYLES.tableCell, textAlign: 'right', paddingRight: '10px' }}>减：借支</td>
              {Array(9).fill(0).map((_, i) => (
                <td key={i} style={STYLES.tableCell}></td>
              ))}
            </tr>
            <tr>
              <td style={{ ...STYLES.tableCell, textAlign: 'right', paddingRight: '10px' }}>总计：</td>
              {renderAmountCells(voucher.total)}
            </tr>
            {/* 合计金额行 */}
            <tr>
              <td style={{ 
                ...STYLES.tableCell,
                ...STYLES.tinyText
              }} colSpan={11}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span>合计金额（大写）：{voucher.totalInChinese}</span>
                  <span style={{ marginLeft: '20px' }}>小写：¥{voucher.total.toFixed(2)}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 受款人签收和财务部付款金额 */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          border: '1px solid black',
          borderTop: 'none',
          ...STYLES.tinyText
        }}>
          <tbody>
            <tr>
              <td style={{ ...STYLES.tableCell, width: '25%' }}>
                受款人签收及受款时间：
              </td>
              <td style={{ ...STYLES.tableCell, width: '25%', height: '30px' }}></td>
              <td style={{ ...STYLES.tableCell, width: '25%' }}>
                财务部付款金额：
              </td>
              <td style={{ ...STYLES.tableCell, width: '25%' }}></td>
            </tr>
          </tbody>
        </table>

        {/* 申请人签署区域 - 带外边框 */}
        <div style={{ 
          border: '1px solid black',
          borderTop: 'none',
          padding: '10px',
          marginBottom: '5px',
          ...STYLES.tinyText
        }}>
          {/* 第一行签署 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
            {renderSignatureSection('申请人签署：')}
            {renderSignatureSection('经理/区经/总监/总经理签署：')}
            {renderSignatureSection('经专业部门主管签署：')}
          </div>

          {/* 第二行签署 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '3px' }}>批核人：</div>
              <div style={{ marginBottom: '3px' }}>董事总经理签署：</div>
              {renderSignatureLine('30px')}
              <div style={{ marginTop: '3px' }}>（日期：　　　　　　）</div>
            </div>
            {renderSignatureSectionWithSpacer('经美联中国行政总裁签署：')}
            {renderSignatureSectionWithSpacer('经执行董事及 CFO 签署：')}
          </div>
        </div>

        {/* 财务部签署区域 */}
        <div style={{ marginBottom: '5px', ...STYLES.tinyText }}>
          <div style={{ marginBottom: '5px' }}>财务部</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
            {renderFinanceSignature('财务主管：', '120px')}
            {renderFinanceSignature('会计：', '120px')}
            {renderFinanceSignature('出纳：', '120px')}
            {renderFinanceSignature('中国部中央专业部门及财务总裁：', '80%', '1')}
          </div>
        </div>

        {/* 注意事项 - 完全按照模板 */}
        <div style={{ ...STYLES.microText, color: '#dc2626', lineHeight: '1.4', fontWeight: 'bold' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '2px' }}>注意事项：</p>
          <p style={{ marginBottom: '1px' }}>1. 如付款金额超过1000元的，请使用支票付款或银行划帐付款；</p>
          <p style={{ marginBottom: '1px' }}>2. 有关申请必须由提出申请部门上级主管/有关部门批核；</p>
          <p style={{ marginBottom: '1px' }}>3. 如费用需要分摊，请填写附表1；</p>
          <p style={{ marginBottom: '1px' }}>4. 申请人必须填写正确资料并连同付款单据交到财务部，否则可能导致延误付款。</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .no-print {
            display: none !important;
          }
          
          .payment-voucher {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 10mm !important;
            page-break-after: avoid;
            background: white !important;
            outline: none !important;
            border: none !important;
          }
          
          .payment-voucher input {
            border: none !important;
            background: transparent !important;
            outline: none !important;
          }
          
          .payment-voucher table {
            page-break-inside: avoid;
            margin: 0 !important;
            border-collapse: collapse;
          }
          
          .payment-voucher table + table {
            margin-top: 0 !important;
            border-top: none !important;
          }
          
          .payment-voucher > div[style*="border"] {
            margin-top: 0 !important;
            border-top: none !important;
          }
          
          @page {
            size: A4;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * 格式化日期为中文格式
 * 
 * @param dateStr - ISO 格式日期字符串（如 "2026-03-13"）
 * @returns 中文格式日期（如 "2026 年 3 月 13 日"）
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const [year, month, day] = dateStr.split('-');
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  
  return `${year} 年 ${monthNum} 月 ${dayNum} 日`;
}

/**
 * 渲染签名下划线
 * 
 * @param height - 下划线高度
 * @returns 下划线元素
 */
const renderSignatureLine = (height: string) => (
  <div style={{ 
    borderBottom: '1px solid black',
    height,
    marginLeft: '5px',
    width: '80%'
  }}></div>
);

/**
 * 渲染签署区域
 * 
 * @param label - 签署标签
 * @param dateSpaces - 日期空格数量（默认6个全角空格）
 * @returns 签署区域元素
 */
const renderSignatureSection = (label: string, dateSpaces: string = '　　　　　　') => (
  <div style={{ flex: 1 }}>
    <div style={{ marginBottom: '3px' }}>{label}</div>
    {renderSignatureLine('30px')}
    <div style={{ marginTop: '3px' }}>（日期：{dateSpaces}）</div>
  </div>
);

/**
 * 渲染带空行的签署区域（用于对齐）
 * 
 * @param label - 签署标签
 * @param dateSpaces - 日期空格数量（默认6个全角空格）
 * @returns 签署区域元素
 */
const renderSignatureSectionWithSpacer = (label: string, dateSpaces: string = '　　　　　　') => (
  <div style={{ flex: 1 }}>
    <div style={{ marginBottom: '3px' }}>&nbsp;</div>
    <div style={{ marginBottom: '3px' }}>{label}</div>
    {renderSignatureLine('30px')}
    <div style={{ marginTop: '3px' }}>（日期：{dateSpaces}）</div>
  </div>
);

/**
 * 渲染复选框选项
 * 
 * @param label - 选项标签
 * @param checked - 是否选中
 * @param marginRight - 右边距
 * @returns 复选框元素
 */
const renderCheckbox = (label: string, checked: boolean, marginRight: string = '25px') => (
  <label style={{ marginRight }}>
    <input 
      type="checkbox" 
      checked={checked} 
      readOnly 
      style={{ marginRight: '3px', verticalAlign: 'middle' }}
    />
    {label}
  </label>
);

/**
 * 渲染下划线输入字段
 * 
 * @param label - 字段标签
 * @param value - 字段值
 * @returns 下划线输入字段元素
 */
const renderUnderlineField = (label: string, value: string) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{label}</span>
    <span style={{ 
      ...STYLES.underlineInput,
      flex: 1,
      marginLeft: '5px'
    }}>
      {value}&nbsp;
    </span>
  </div>
);

/**
 * 渲染财务签名框
 * 
 * @param label - 签名标签
 * @param width - 签名框宽度
 * @param flex - flex 属性
 * @returns 签名框元素
 */
const renderFinanceSignature = (label: string, width: string, flex: string = '0 0 auto') => (
  <div style={{ flex }}>
    <div style={{ marginBottom: '3px' }}>{label}</div>
    <div style={{ 
      ...STYLES.underlineInput,
      width,
      marginLeft: '5px',
      height: '30px'
    }}></div>
  </div>
);

/**
 * 渲染金额单元格
 * 
 * 将金额拆分为百万、十万、万、千、百、十、元、角、分九位数字
 * 只隐藏最高位之前的前导零，保留所有有效数字
 * 
 * @param amount - 金额数值
 * @returns 金额单元格数组
 */
function renderAmountCells(amount: number) {
  const amountStr = amount.toFixed(2);
  const [integerPart, decimalPart] = amountStr.split('.');
  
  // 补齐到7位（百万到元）
  const paddedInteger = integerPart.padStart(7, '0');
  
  const digits = [
    paddedInteger[0], // 百万
    paddedInteger[1], // 十万
    paddedInteger[2], // 万
    paddedInteger[3], // 千
    paddedInteger[4], // 百
    paddedInteger[5], // 十
    paddedInteger[6], // 元
    decimalPart[0],   // 角
    decimalPart[1],   // 分
  ];
  
  // 找到第一个非零数字的位置（用于隐藏前导零）
  let firstNonZeroIndex = -1;
  for (let i = 0; i < 7; i++) {
    if (digits[i] !== '0') {
      firstNonZeroIndex = i;
      break;
    }
  }
  
  return digits.map((digit, index) => {
    // 只隐藏最高位之前的前导零，小数部分全部显示
    const isDecimal = index >= 7;
    const isLeadingZero = !isDecimal && index < firstNonZeroIndex;
    const displayValue = isLeadingZero ? '' : digit;
    
    return (
      <td 
        key={index} 
        style={{ 
          ...STYLES.tableCell,
          textAlign: 'center',
          fontFamily: 'monospace',
          ...STYLES.tinyText
        }}
      >
        {displayValue}
      </td>
    );
  });
}
