import { create } from 'zustand';

/**
 * 发票分类
 */
export type InvoiceCategory = 'transportation' | 'meals' | 'accommodation' | 'office' | 'other';

/**
 * 发票数据
 */
export interface Invoice {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  amount: number | null;
  category: InvoiceCategory;
  ocrStatus: 'pending' | 'processing' | 'success' | 'failed';
  ocrText: string | null;
  createdAt: string;
  updatedAt: string;
  reimbursementItemId: string;
}

/**
 * 报销事项数据
 */
export interface ReimbursementItem {
  id: string;
  title: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  invoices?: Invoice[];
  invoiceCount?: number;
  totalAmount?: number;
}

/**
 * 金额汇总数据
 */
export interface AmountSummary {
  total: number;
  byCategory: {
    transportation: number;
    meals: number;
    accommodation: number;
    office: number;
    other: number;
  };
}

/**
 * Store 状态
 */
interface ReimbursementStore {
  // 报销事项列表
  items: ReimbursementItem[];
  // 当前选中的报销事项
  currentItem: ReimbursementItem | null;
  // 加载状态
  loading: boolean;
  // 错误信息
  error: string | null;

  // 操作方法
  setItems: (items: ReimbursementItem[]) => void;
  setCurrentItem: (item: ReimbursementItem | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // 报销事项操作
  addItem: (item: ReimbursementItem) => void;
  updateItem: (id: string, updates: Partial<ReimbursementItem>) => void;
  removeItem: (id: string) => void;

  // 发票操作
  addInvoice: (itemId: string, invoice: Invoice) => void;
  updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;
  removeInvoice: (invoiceId: string) => void;

  // 重置状态
  reset: () => void;
}

const initialState = {
  items: [],
  currentItem: null,
  loading: false,
  error: null,
};

/**
 * 计算发票总金额
 */
function calculateInvoiceTotal(invoices: Invoice[]): number {
  return invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
}

/**
 * 更新报销事项的发票相关字段
 */
function updateItemInvoices(item: ReimbursementItem, invoices: Invoice[]): ReimbursementItem {
  return {
    ...item,
    invoices,
    invoiceCount: invoices.length,
    totalAmount: calculateInvoiceTotal(invoices),
  };
}

/**
 * 报销事项状态管理 Store
 */
export const useReimbursementStore = create<ReimbursementStore>((set) => ({
  ...initialState,

  setItems: (items) => set({ items }),

  setCurrentItem: (item) => set({ currentItem: item }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  addItem: (item) =>
    set((state) => ({
      items: [item, ...state.items],
    })),

  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
      currentItem:
        state.currentItem?.id === id
          ? { ...state.currentItem, ...updates }
          : state.currentItem,
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      currentItem: state.currentItem?.id === id ? null : state.currentItem,
    })),

  addInvoice: (itemId, invoice) =>
    set((state) => {
      // 更新 items 列表（如果存在）
      const updatedItems = state.items.map((item) => {
        if (item.id !== itemId) return item;
        const invoices = [...(item.invoices || []), invoice];
        return updateItemInvoices(item, invoices);
      });

      // 更新 currentItem（如果是当前查看的报销事项）
      let updatedCurrentItem = state.currentItem;
      if (state.currentItem?.id === itemId) {
        const invoices = [...(state.currentItem.invoices || []), invoice];
        updatedCurrentItem = updateItemInvoices(state.currentItem, invoices);
      }

      return { items: updatedItems, currentItem: updatedCurrentItem };
    }),

  updateInvoice: (invoiceId, updates) =>
    set((state) => {
      // 更新发票的辅助函数
      const updateInvoiceInList = (invoices: Invoice[]) =>
        invoices.map((inv) => (inv.id === invoiceId ? { ...inv, ...updates } : inv));

      // 更新 items 列表
      const updatedItems = state.items.map((item) => {
        if (!item.invoices?.some((inv) => inv.id === invoiceId)) return item;
        return updateItemInvoices(item, updateInvoiceInList(item.invoices));
      });

      // 更新 currentItem
      let updatedCurrentItem = state.currentItem;
      if (state.currentItem?.invoices?.some((inv) => inv.id === invoiceId)) {
        updatedCurrentItem = updateItemInvoices(
          state.currentItem,
          updateInvoiceInList(state.currentItem.invoices)
        );
      }

      return { items: updatedItems, currentItem: updatedCurrentItem };
    }),

  removeInvoice: (invoiceId) =>
    set((state) => {
      // 移除发票的辅助函数
      const removeInvoiceFromList = (invoices: Invoice[]) =>
        invoices.filter((inv) => inv.id !== invoiceId);

      // 更新 items 列表
      const updatedItems = state.items.map((item) => {
        if (!item.invoices?.some((inv) => inv.id === invoiceId)) return item;
        return updateItemInvoices(item, removeInvoiceFromList(item.invoices));
      });

      // 更新 currentItem
      let updatedCurrentItem = state.currentItem;
      if (state.currentItem?.invoices?.some((inv) => inv.id === invoiceId)) {
        updatedCurrentItem = updateItemInvoices(
          state.currentItem,
          removeInvoiceFromList(state.currentItem.invoices)
        );
      }

      return { items: updatedItems, currentItem: updatedCurrentItem };
    }),

  reset: () => set(initialState),
}));
