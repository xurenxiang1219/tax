/**
 * 发票分类器
 * 基于关键词匹配算法对发票进行自动分类
 */

export type InvoiceCategory = 'transportation' | 'meals' | 'accommodation' | 'office' | 'other';

/**
 * 分类关键词映射表
 */
const CATEGORY_KEYWORDS: Record<Exclude<InvoiceCategory, 'other'>, string[]> = {
  transportation: [
    '出租车', '的士', '打车', '滴滴', '网约车', '高德', '中交出行',
    '地铁', '公交', '巴士', '公共汽车',
    '火车', '高铁', '动车', '铁路',
    '飞机', '航空', '机票', '登机',
    '加油', '油费', '停车', '过路费', '高速',
    '租车', '汽车租赁', '出行', '运输服务', '客运'
  ],
  meals: [
    '餐厅', '饭店', '酒楼', '食府', '餐馆',
    '快餐', '小吃', '美食', '料理',
    '咖啡', '茶馆', '奶茶', '饮品',
    '外卖', '送餐', '餐饮',
    '早餐', '午餐', '晚餐', '宵夜'
  ],
  accommodation: [
    '酒店', '宾馆', '旅馆', '客栈',
    '住宿', '民宿', '公寓',
    '酒店式', '度假村', '会所'
  ],
  office: [
    '文具', '办公用品', '纸张', '笔',
    '打印', '复印', '墨盒', '硒鼓',
    '文件夹', '档案袋', '订书机',
    '电脑', '键盘', '鼠标', '显示器',
    '办公设备', '办公耗材'
  ]
};

/**
 * 发票分类器接口
 */
export interface InvoiceClassifier {
  classify(ocrText: string): InvoiceCategory;
}

/**
 * 基于关键词匹配的发票分类器实现
 */
class KeywordBasedClassifier implements InvoiceClassifier {
  /**
   * 对发票文本进行分类
   * @param ocrText OCR 识别的文本内容
   * @returns 发票分类
   */
  classify(ocrText: string): InvoiceCategory {
    if (!ocrText || ocrText.trim() === '') {
      return 'other';
    }

    const normalizedText = ocrText.toLowerCase().trim();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => normalizedText.includes(keyword))) {
        return category as InvoiceCategory;
      }
    }

    return 'other';
  }
}

/**
 * 导出分类器单例实例
 */
export const classifier = new KeywordBasedClassifier();

/**
 * 便捷函数：对发票文本进行分类
 * @param ocrText OCR 识别的文本内容
 * @returns 发票分类
 */
export function classifyInvoice(ocrText: string): InvoiceCategory {
  return classifier.classify(ocrText);
}
