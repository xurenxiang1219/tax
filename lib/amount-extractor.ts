/**
 * 金额提取工具
 * 
 * 从 OCR 识别的文本中提取金额
 */

/**
 * 尝试从匹配结果中提取有效的金额
 * 
 * @param matches - 正则匹配结果数组
 * @returns 提取的金额，如果未找到则返回 null
 */
function extractValidAmount(matches: RegExpMatchArray[]): number | null {
  if (matches.length === 0) return null;
  
  const lastMatch = matches[matches.length - 1];
  const amount = parseFloat(lastMatch[1]);
  
  if (!isNaN(amount) && amount > 0) {
    return Number(amount.toFixed(2));
  }
  
  return null;
}

/**
 * 从 OCR 文本中提取金额
 * 
 * 支持的格式：
 * - ¥123.45 或 ￥123.45
 * - 123.45元
 * - 金额：123.45
 * - 合计：123.45
 * - 总计：123.45
 * - 小计：123.45
 * - 应付：123.45
 * - 实付：123.45
 * 
 * 优先级：优先提取标签化的金额（如"合计"、"总计"），其次提取最后出现的货币符号后的金额
 * 
 * @param text - OCR 识别的文本
 * @returns 提取的金额，如果未找到则返回 null
 */
export function extractAmount(text: string): number | null {
  const cleanText = text.replace(/\s+/g, '');
  
  const labeledPatterns = [
    /合计[：:]\s*(\d+\.?\d*)/,
    /总计[：:]\s*(\d+\.?\d*)/,
    /价税合计[：:]\s*(\d+\.?\d*)/,
    /应付[：:]\s*(\d+\.?\d*)/,
    /实付[：:]\s*(\d+\.?\d*)/,
    /小计[：:]\s*(\d+\.?\d*)/,
    /金额[：:]\s*(\d+\.?\d*)/,
  ];

  for (const pattern of labeledPatterns) {
    const match = cleanText.match(pattern);
    if (match?.[1]) {
      const amount = extractValidAmount([match as RegExpMatchArray]);
      if (amount !== null) {
        return amount;
      }
    }
  }

  const currencyMatches = Array.from(cleanText.matchAll(/[¥￥](\d+\.?\d*)/g));
  const currencyAmount = extractValidAmount(currencyMatches);
  if (currencyAmount !== null) {
    return currencyAmount;
  }

  const yuanMatches = Array.from(cleanText.matchAll(/(\d+\.?\d*)元/g));
  return extractValidAmount(yuanMatches);
}
