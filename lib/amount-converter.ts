/**
 * 金额大写转换器
 * 将阿拉伯数字金额转换为中文大写格式
 */

const DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const UNITS = ['', '拾', '佰', '仟'];
const BIG_UNITS = ['', '万', '亿'];

/**
 * 将阿拉伯数字金额转换为中文大写
 * 验证需求: 19.12
 * 
 * @param amount 金额（支持整数和小数，最多两位小数）
 * @returns 中文大写金额字符串
 * 
 * @example
 * toChineseWords(100) // "壹佰元整"
 * toChineseWords(123.45) // "壹佰贰拾叁元肆角伍分"
 * toChineseWords(0) // "零元整"
 * toChineseWords(10000.00) // "壹万元整"
 */
export function toChineseWords(amount: number): string {
  // 输入验证
  if (!Number.isFinite(amount)) {
    throw new Error('金额必须是有效数字');
  }

  if (amount < 0) {
    throw new Error('金额不能为负数');
  }

  // 四舍五入到两位小数
  amount = Math.round(amount * 100) / 100;

  // 分离整数和小数部分
  const [integerPart, decimalPart = ''] = amount.toFixed(2).split('.');
  
  // 转换整数和小数部分
  const integerWords = convertInteger(parseInt(integerPart, 10));
  const decimalWords = convertDecimal(decimalPart);
  
  // 组合结果（特殊处理零元整的情况）
  if (integerWords === '零' && decimalWords === '整') {
    return '零元整';
  }
  
  return `${integerWords}元${decimalWords}`;
}

/**
 * 转换整数部分
 * 
 * 将整数按万、亿分节，每节最多四位数字
 * 处理节之间的"零"字补充规则
 */
function convertInteger(num: number): string {
  if (num === 0) {
    return '零';
  }

  // 按万进制分节（个、万、亿）
  const sections: number[] = [];
  let temp = num;
  while (temp > 0) {
    sections.push(temp % 10000);
    temp = Math.floor(temp / 10000);
  }

  let result = '';
  
  // 从高位到低位处理每一节
  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i];
    
    // 跳过值为0的节
    if (section === 0) {
      continue;
    }
    
    const sectionWords = convertSection(section);
    
    // 判断是否需要在当前节前补"零"
    const needZero = shouldAddZero(result, sections, i, section);
    
    if (needZero) {
      result += '零';
    }
    
    result += sectionWords + BIG_UNITS[i];
  }

  // 清理多余的"零"字
  result = cleanupZeros(result);

  return result;
}

/**
 * 判断是否需要在当前节前补"零"
 * 
 * 补零规则：
 * 1. result不为空（不是第一节）
 * 2. 前面有跳过的0节，或当前节小于1000且上一节不为0
 */
function shouldAddZero(
  result: string,
  sections: number[],
  currentIndex: number,
  currentSection: number
): boolean {
  if (result === '') {
    return false;
  }

  // 检查是否有跳过的0节
  for (let j = currentIndex + 1; j < sections.length; j++) {
    if (sections[j] === 0) {
      return true;
    }
  }

  // 当前节小于1000且紧邻的上一节不是0
  if (currentSection < 1000 && currentIndex + 1 < sections.length && sections[currentIndex + 1] !== 0) {
    return true;
  }

  return false;
}

/**
 * 清理多余的"零"字
 */
function cleanupZeros(text: string): string {
  return text
    .replace(/零+/g, '零')        // 多个零合并为一个
    .replace(/零([万亿])/g, '$1') // 零万、零亿 -> 万、亿
    .replace(/零+$/, '');         // 去掉末尾的零
}

/**
 * 转换四位数节（0-9999）
 * 
 * 从低位到高位处理，正确处理节内的"零"字
 */
function convertSection(num: number): string {
  let result = '';
  let hasZero = false;

  for (let i = 0; i < 4 && num > 0; i++) {
    const digit = num % 10;
    
    if (digit === 0) {
      hasZero = true;
    } else {
      // 如果之前有零且结果不为空，需要补零
      if (hasZero && result !== '') {
        result = '零' + result;
      }
      result = DIGITS[digit] + UNITS[i] + result;
      hasZero = false;
    }
    
    num = Math.floor(num / 10);
  }

  return result;
}

/**
 * 转换小数部分（角、分）
 * 
 * 处理角分的显示规则：
 * - 有角有分：显示角和分
 * - 只有角：只显示角
 * - 只有分：显示"零X分"
 * - 都没有：显示"整"
 */
function convertDecimal(decimal: string): string {
  if (!decimal || decimal === '00') {
    return '整';
  }

  const jiao = parseInt(decimal[0], 10);
  const fen = parseInt(decimal[1], 10);

  if (jiao === 0 && fen === 0) {
    return '整';
  }

  let result = '';
  
  if (jiao > 0) {
    result += DIGITS[jiao] + '角';
  } else if (fen > 0) {
    // 只有分时需要补零
    result += '零';
  }
  
  if (fen > 0) {
    result += DIGITS[fen] + '分';
  }

  return result;
}
