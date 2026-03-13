# 发票报销预审批系统

基于 Next.js 16 的发票报销整理系统，支持 OCR 识别、自动分类和金额汇总。

## 技术栈

- **前端框架**: Next.js 16 (App Router, React 19)
- **UI 组件**: shadcn/ui + Tailwind CSS
- **状态管理**: Zustand
- **数据库**: Better-SQLite3 + Prisma ORM
- **OCR 引擎**: Tesseract.js (客户端)
- **数据导出**: xlsx (Excel), jsPDF (PDF)
- **类型安全**: TypeScript
- **测试框架**: Vitest + fast-check
- **包管理器**: pnpm

## 项目结构

```
.
├── app/                      # Next.js App Router 页面
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 首页
│   ├── globals.css          # 全局样式
│   └── api/                 # API 路由
├── components/              # React 组件
│   └── ui/                  # shadcn/ui 组件
├── lib/                     # 工具函数和服务
│   ├── prisma.ts           # Prisma 客户端
│   └── utils.ts            # 通用工具函数
├── store/                   # Zustand 状态管理
├── prisma/                  # Prisma 配置和迁移
│   ├── schema.prisma       # 数据库模型
│   └── migrations/         # 数据库迁移文件
├── uploads/                 # 文件上传目录
│   └── invoices/           # 发票文件存储
└── tests/                   # 测试文件
```

## 开发指南

### 安装依赖

```bash
pnpm install
```

### 初始化数据库

```bash
pnpm prisma:migrate
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 测试 UI
pnpm test:ui
```

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 数据库管理

### 生成 Prisma Client

```bash
pnpm prisma:generate
```

### 创建新的迁移

```bash
pnpm prisma:migrate
```

### 查看数据库

```bash
pnpm prisma studio
```

## 核心功能

- ✅ 报销事项管理（创建、编辑、删除、查询）
- ✅ 发票上传（单个/批量/拖拽，支持 PDF 和图片格式）
- ✅ OCR 自动识别发票金额
- ✅ 智能发票分类（交通费、餐饮费、住宿费、办公用品、其他）
- ✅ 金额汇总和分类统计
- ✅ 发票去重检测
- ✅ 数据导出（Excel、PDF）
- ✅ 支付证明单生成和打印
- ✅ 移动端响应式设计

## 开发规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 代码规范
- 使用 Tailwind CSS 进行样式开发
- 优先使用 shadcn/ui 组件
- 编写单元测试和属性测试
- 提交前运行 `pnpm lint` 和 `pnpm test`

## License

MIT
