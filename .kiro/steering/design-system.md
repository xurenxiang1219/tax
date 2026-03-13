# 设计系统规范

## 概述

本文档定义了发票报销预审批系统的视觉设计规范，包括颜色、字体、间距、组件样式等，确保整个应用的视觉一致性和用户体验。

---

## 颜色系统

### 主色调

使用 Tailwind CSS 默认调色板，主色调为蓝色系：

```css
/* 主色 - 用于主要操作按钮、链接等 */
primary: blue-600 (#2563eb)
primary-hover: blue-700 (#1d4ed8)
primary-light: blue-50 (#eff6ff)

/* 次要色 - 用于次要操作 */
secondary: gray-600 (#4b5563)
secondary-hover: gray-700 (#374151)

/* 成功色 - 用于成功状态提示 */
success: green-600 (#16a34a)
success-light: green-50 (#f0fdf4)

/* 警告色 - 用于警告提示 */
warning: yellow-600 (#ca8a04)
warning-light: yellow-50 (#fefce8)

/* 错误色 - 用于错误提示 */
error: red-600 (#dc2626)
error-light: red-50 (#fef2f2)

/* 信息色 - 用于信息提示 */
info: blue-600 (#2563eb)
info-light: blue-50 (#eff6ff)
```

### 中性色

```css
/* 背景色 */
bg-primary: white (#ffffff)
bg-secondary: gray-50 (#f9fafb)
bg-tertiary: gray-100 (#f3f4f6)

/* 边框色 */
border-primary: gray-200 (#e5e7eb)
border-secondary: gray-300 (#d1d5db)

/* 文字色 */
text-primary: gray-900 (#111827)
text-secondary: gray-600 (#4b5563)
text-tertiary: gray-400 (#9ca3af)
text-disabled: gray-300 (#d1d5db)
```

### 发票分类颜色

为不同的发票分类分配专属颜色，便于视觉识别：

```css
/* 交通费 */
transportation: blue-500 (#3b82f6)

/* 餐饮费 */
meals: orange-500 (#f97316)

/* 住宿费 */
accommodation: purple-500 (#a855f7)

/* 办公用品 */
office: green-500 (#22c55e)

/* 其他 */
other: gray-500 (#6b7280)
```

---

## 字体系统

### 字体家族

```css
/* 中文字体栈 */
font-sans: 
  -apple-system, 
  BlinkMacSystemFont, 
  "Segoe UI", 
  "PingFang SC",      /* macOS 中文 */
  "Hiragino Sans GB", /* macOS 旧版中文 */
  "Microsoft YaHei",  /* Windows 中文 */
  "Helvetica Neue", 
  Arial, 
  sans-serif;

/* 等宽字体（用于代码、金额等） */
font-mono: 
  "SF Mono", 
  "Consolas", 
  "Liberation Mono", 
  "Menlo", 
  monospace;
```

### 字体大小

使用 Tailwind CSS 的字体大小系统：

```css
/* 标题 */
text-3xl: 1.875rem (30px)  /* 页面主标题 */
text-2xl: 1.5rem (24px)    /* 区块标题 */
text-xl: 1.25rem (20px)    /* 卡片标题 */
text-lg: 1.125rem (18px)   /* 小标题 */

/* 正文 */
text-base: 1rem (16px)     /* 正文、按钮文字 */
text-sm: 0.875rem (14px)   /* 辅助文字、表单标签 */
text-xs: 0.75rem (12px)    /* 提示文字、标签 */
```

### 字体粗细

```css
font-normal: 400   /* 正文 */
font-medium: 500   /* 强调文字 */
font-semibold: 600 /* 标题 */
font-bold: 700     /* 重要标题 */
```

### 行高

```css
leading-tight: 1.25    /* 标题 */
leading-normal: 1.5    /* 正文 */
leading-relaxed: 1.625 /* 长文本 */
```

---

## 间距系统

使用 Tailwind CSS 的间距系统（基于 4px）：

```css
/* 组件内间距 */
p-2: 0.5rem (8px)   /* 小按钮、标签 */
p-3: 0.75rem (12px) /* 输入框 */
p-4: 1rem (16px)    /* 卡片、按钮 */
p-6: 1.5rem (24px)  /* 大卡片 */
p-8: 2rem (32px)    /* 页面容器 */

/* 组件间距 */
gap-2: 0.5rem (8px)   /* 紧密排列 */
gap-4: 1rem (16px)    /* 常规间距 */
gap-6: 1.5rem (24px)  /* 宽松间距 */
gap-8: 2rem (32px)    /* 区块间距 */

/* 页面边距 */
mx-auto: 水平居中
max-w-7xl: 最大宽度 1280px（桌面端）
px-4: 移动端左右边距 16px
px-6: 平板端左右边距 24px
px-8: 桌面端左右边距 32px
```

---

## 圆角系统

```css
rounded-none: 0px      /* 无圆角 */
rounded-sm: 0.125rem (2px)  /* 小圆角 */
rounded: 0.25rem (4px)      /* 默认圆角（输入框、按钮） */
rounded-md: 0.375rem (6px)  /* 中等圆角（卡片） */
rounded-lg: 0.5rem (8px)    /* 大圆角（模态框） */
rounded-xl: 0.75rem (12px)  /* 超大圆角 */
rounded-full: 9999px        /* 完全圆形（头像、徽章） */
```

---

## 阴影系统

```css
/* 卡片阴影 */
shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)
shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)
shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1)

/* 悬浮效果 */
hover:shadow-lg: 鼠标悬停时增加阴影
```

---

## 组件样式规范

### 按钮

```tsx
/* 主要按钮 */
className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 
           transition-colors duration-200 font-medium"

/* 次要按钮 */
className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 
           transition-colors duration-200 font-medium"

/* 危险按钮 */
className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 
           transition-colors duration-200 font-medium"

/* 文字按钮 */
className="px-2 py-1 text-blue-600 hover:text-blue-700 hover:underline 
           transition-colors duration-200"

/* 图标按钮 */
className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 
           rounded transition-colors duration-200"
```

### 输入框

```tsx
/* 文本输入框 */
className="w-full px-3 py-2 border border-gray-300 rounded 
           focus:outline-none focus:ring-2 focus:ring-blue-500 
           focus:border-transparent transition-all duration-200"

/* 错误状态 */
className="w-full px-3 py-2 border border-red-500 rounded 
           focus:outline-none focus:ring-2 focus:ring-red-500"

/* 禁用状态 */
className="w-full px-3 py-2 border border-gray-300 rounded 
           bg-gray-100 text-gray-400 cursor-not-allowed"
```

### 卡片

```tsx
/* 基础卡片 */
className="bg-white rounded-md shadow p-6 border border-gray-200"

/* 可点击卡片 */
className="bg-white rounded-md shadow p-6 border border-gray-200 
           hover:shadow-lg transition-shadow duration-200 cursor-pointer"

/* 高亮卡片 */
className="bg-blue-50 rounded-md shadow p-6 border border-blue-200"
```

### 标签/徽章

```tsx
/* 基础标签 */
className="inline-flex items-center px-2.5 py-0.5 rounded-full 
           text-xs font-medium bg-gray-100 text-gray-800"

/* 分类标签（根据分类使用不同颜色） */
交通费: "bg-blue-100 text-blue-800"
餐饮费: "bg-orange-100 text-orange-800"
住宿费: "bg-purple-100 text-purple-800"
办公用品: "bg-green-100 text-green-800"
其他: "bg-gray-100 text-gray-800"
```

### 提示框

```tsx
/* 成功提示 */
className="p-4 bg-green-50 border border-green-200 rounded-md 
           text-green-800 flex items-start gap-3"

/* 警告提示 */
className="p-4 bg-yellow-50 border border-yellow-200 rounded-md 
           text-yellow-800 flex items-start gap-3"

/* 错误提示 */
className="p-4 bg-red-50 border border-red-200 rounded-md 
           text-red-800 flex items-start gap-3"

/* 信息提示 */
className="p-4 bg-blue-50 border border-blue-200 rounded-md 
           text-blue-800 flex items-start gap-3"
```

---

## 图标规范

### 图标库

使用 **Lucide React**，统一的图标风格。

### 图标大小

```tsx
/* 小图标（按钮内、标签旁） */
size={16}  // 16px

/* 常规图标（列表项、卡片） */
size={20}  // 20px

/* 大图标（空状态、引导页） */
size={24}  // 24px

/* 超大图标（占位符） */
size={48}  // 48px
```

### 常用图标

```tsx
import {
  Plus,           // 添加
  Upload,         // 上传
  Download,       // 下载
  Trash2,         // 删除
  Edit,           // 编辑
  Eye,            // 查看
  FileText,       // 文件
  Image,          // 图片
  Receipt,        // 发票
  Calculator,     // 计算
  Printer,        // 打印
  Search,         // 搜索
  Filter,         // 筛选
  Check,          // 成功
  X,              // 关闭/错误
  AlertCircle,    // 警告
  Info,           // 信息
  ChevronRight,   // 右箭头
  ChevronDown,    // 下箭头
  MoreVertical,   // 更多操作
} from 'lucide-react';
```

---

## 响应式断点

使用 Tailwind CSS 的默认断点：

```css
/* 移动端优先 */
默认: < 640px

/* 平板 */
sm: >= 640px

/* 小型桌面 */
md: >= 768px

/* 桌面 */
lg: >= 1024px

/* 大屏桌面 */
xl: >= 1280px

/* 超大屏 */
2xl: >= 1536px
```

### 响应式布局示例

```tsx
/* 移动端单列，桌面端双列 */
className="grid grid-cols-1 md:grid-cols-2 gap-4"

/* 移动端单列，平板双列，桌面三列 */
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"

/* 响应式间距 */
className="px-4 sm:px-6 lg:px-8"

/* 响应式字体 */
className="text-2xl md:text-3xl lg:text-4xl"
```

---

## 动画和过渡

### 过渡时间

```css
duration-75: 75ms    /* 快速反馈 */
duration-150: 150ms  /* 常规过渡 */
duration-200: 200ms  /* 默认过渡 */
duration-300: 300ms  /* 慢速过渡 */
duration-500: 500ms  /* 动画效果 */
```

### 常用过渡

```tsx
/* 颜色过渡 */
className="transition-colors duration-200"

/* 阴影过渡 */
className="transition-shadow duration-200"

/* 全部属性过渡 */
className="transition-all duration-200"

/* 变换过渡 */
className="transition-transform duration-200 hover:scale-105"
```

### 加载动画

```tsx
/* 旋转加载 */
className="animate-spin"

/* 脉冲加载 */
className="animate-pulse"

/* 弹跳加载 */
className="animate-bounce"
```

---

## 打印样式

### 支付证明单打印

```css
@media print {
  /* 隐藏不需要打印的元素 */
  .no-print {
    display: none !important;
  }
  
  /* 打印时使用白色背景 */
  body {
    background: white;
  }
  
  /* 确保表格边框显示 */
  table, th, td {
    border: 1px solid black !important;
  }
  
  /* 避免分页断裂 */
  .payment-voucher {
    page-break-inside: avoid;
  }
  
  /* A4 纸张大小 */
  @page {
    size: A4;
    margin: 1cm;
  }
}
```

---

## 无障碍规范

### 颜色对比度

- 正文文字与背景对比度至少 4.5:1
- 大号文字（18px+）与背景对比度至少 3:1
- 交互元素的焦点状态必须清晰可见

### 键盘导航

```tsx
/* 焦点样式 */
className="focus:outline-none focus:ring-2 focus:ring-blue-500 
           focus:ring-offset-2"

/* 跳过链接（用于键盘用户快速跳转到主内容） */
<a href="#main-content" className="sr-only focus:not-sr-only">
  跳转到主内容
</a>
```

### 语义化 HTML

- 使用正确的 HTML 标签（button、nav、main、article 等）
- 为图片添加 alt 属性
- 为表单元素添加 label
- 使用 aria-label 为图标按钮提供说明

---

## 使用建议

1. **优先使用 shadcn/ui 组件**：shadcn/ui 已经实现了大部分常用组件，并遵循了良好的设计规范
2. **保持一致性**：在整个应用中使用相同的颜色、间距、圆角等
3. **移动端优先**：先设计移动端布局，再扩展到桌面端
4. **性能优化**：避免过度使用阴影和动画，影响性能
5. **可访问性**：确保所有交互元素都可以通过键盘访问
6. **深色模式**：预留深色模式的可能性（使用 Tailwind 的 dark: 前缀）

---

## 参考资源

- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [Lucide 图标库](https://lucide.dev/)
- [WCAG 无障碍指南](https://www.w3.org/WAI/WCAG21/quickref/)
