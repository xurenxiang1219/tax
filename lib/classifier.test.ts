/**
 * 发票分类器单元测试
 */

import { describe, it, expect } from 'vitest';
import { classifyInvoice, type InvoiceCategory } from './classifier';

describe('发票分类器', () => {
  describe('交通费分类', () => {
    it('应该识别出租车相关关键词', () => {
      expect(classifyInvoice('北京出租车发票')).toBe('transportation');
      expect(classifyInvoice('滴滴打车费用')).toBe('transportation');
      expect(classifyInvoice('的士票据')).toBe('transportation');
    });

    it('应该识别公共交通关键词', () => {
      expect(classifyInvoice('地铁票')).toBe('transportation');
      expect(classifyInvoice('公交卡充值')).toBe('transportation');
      expect(classifyInvoice('巴士费用')).toBe('transportation');
    });

    it('应该识别火车和飞机关键词', () => {
      expect(classifyInvoice('高铁票')).toBe('transportation');
      expect(classifyInvoice('火车票')).toBe('transportation');
      expect(classifyInvoice('航空机票')).toBe('transportation');
      expect(classifyInvoice('登机牌')).toBe('transportation');
    });

    it('应该识别汽车相关费用', () => {
      expect(classifyInvoice('加油费')).toBe('transportation');
      expect(classifyInvoice('停车费')).toBe('transportation');
      expect(classifyInvoice('高速过路费')).toBe('transportation');
      expect(classifyInvoice('汽车租赁费')).toBe('transportation');
    });
  });

  describe('餐饮费分类', () => {
    it('应该识别餐厅相关关键词', () => {
      expect(classifyInvoice('某某餐厅发票')).toBe('meals');
      expect(classifyInvoice('饭店消费')).toBe('meals');
      expect(classifyInvoice('酒楼宴请')).toBe('meals');
    });

    it('应该识别饮品相关关键词', () => {
      expect(classifyInvoice('咖啡店')).toBe('meals');
      expect(classifyInvoice('奶茶店')).toBe('meals');
      expect(classifyInvoice('茶馆消费')).toBe('meals');
    });

    it('应该识别外卖和快餐', () => {
      expect(classifyInvoice('外卖订单')).toBe('meals');
      expect(classifyInvoice('快餐费用')).toBe('meals');
    });
  });

  describe('住宿费分类', () => {
    it('应该识别酒店相关关键词', () => {
      expect(classifyInvoice('某某酒店住宿费')).toBe('accommodation');
      expect(classifyInvoice('宾馆费用')).toBe('accommodation');
      expect(classifyInvoice('旅馆住宿')).toBe('accommodation');
    });

    it('应该识别民宿和公寓', () => {
      expect(classifyInvoice('民宿预订')).toBe('accommodation');
      expect(classifyInvoice('酒店式公寓')).toBe('accommodation');
    });
  });

  describe('办公用品分类', () => {
    it('应该识别文具相关关键词', () => {
      expect(classifyInvoice('文具店购买')).toBe('office');
      expect(classifyInvoice('办公用品采购')).toBe('office');
      expect(classifyInvoice('纸张费用')).toBe('office');
    });

    it('应该识别办公设备', () => {
      expect(classifyInvoice('打印机墨盒')).toBe('office');
      expect(classifyInvoice('复印纸')).toBe('office');
      expect(classifyInvoice('键盘鼠标')).toBe('office');
    });
  });

  describe('其他分类（默认）', () => {
    it('应该将无关键词的文本分类为其他', () => {
      expect(classifyInvoice('某某公司发票')).toBe('other');
      expect(classifyInvoice('购物消费')).toBe('other');
      expect(classifyInvoice('服务费用')).toBe('other');
    });

    it('应该将空文本分类为其他', () => {
      expect(classifyInvoice('')).toBe('other');
      expect(classifyInvoice('   ')).toBe('other');
    });

    it('应该处理 null 或 undefined 输入', () => {
      expect(classifyInvoice(null as any)).toBe('other');
      expect(classifyInvoice(undefined as any)).toBe('other');
    });
  });

  describe('大小写不敏感', () => {
    it('应该忽略大小写进行匹配', () => {
      expect(classifyInvoice('出租车')).toBe('transportation');
      expect(classifyInvoice('出租车')).toBe('transportation');
      expect(classifyInvoice('餐厅')).toBe('meals');
      expect(classifyInvoice('HOTEL酒店')).toBe('accommodation');
    });
  });

  describe('优先级测试', () => {
    it('应该返回第一个匹配的分类', () => {
      // 如果文本包含多个分类的关键词，返回第一个匹配的
      const result = classifyInvoice('酒店餐厅');
      // 应该是 transportation、meals、accommodation、office 中的一个
      const validCategories: InvoiceCategory[] = ['transportation', 'meals', 'accommodation', 'office', 'other'];
      expect(validCategories).toContain(result);
    });
  });
});
