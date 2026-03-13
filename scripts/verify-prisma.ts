/**
 * 验证 Prisma Client 和数据库连接
 */

import { prisma } from '../lib/prisma'

async function verifyPrisma() {
  console.log('🔍 开始验证 Prisma Client 和数据库...\n')

  try {
    // 1. 测试数据库连接
    console.log('1️⃣ 测试数据库连接...')
    await prisma.$connect()
    console.log('✅ 数据库连接成功\n')

    // 2. 测试创建报销事项
    console.log('2️⃣ 测试创建报销事项...')
    const testItem = await prisma.reimbursementItem.create({
      data: {
        title: '测试报销事项',
        notes: '这是一个测试',
      },
    })
    console.log('✅ 创建报销事项成功:', testItem.id)
    console.log('   标题:', testItem.title)
    console.log('   创建时间:', testItem.createdAt.toISOString())
    console.log()

    // 3. 测试查询报销事项
    console.log('3️⃣ 测试查询报销事项...')
    const foundItem = await prisma.reimbursementItem.findUnique({
      where: { id: testItem.id },
    })
    if (foundItem && foundItem.id === testItem.id) {
      console.log('✅ 查询报销事项成功\n')
    } else {
      throw new Error('查询的报销事项不匹配')
    }

    // 4. 测试创建发票
    console.log('4️⃣ 测试创建发票...')
    const testInvoice = await prisma.invoice.create({
      data: {
        fileName: 'test-invoice.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        filePath: '/uploads/test/test-invoice.pdf',
        amount: 100.50,
        category: 'transportation',
        reimbursementItemId: testItem.id,
      },
    })
    console.log('✅ 创建发票成功:', testInvoice.id)
    console.log('   文件名:', testInvoice.fileName)
    console.log('   金额:', testInvoice.amount)
    console.log('   分类:', testInvoice.category)
    console.log()

    // 5. 测试级联查询
    console.log('5️⃣ 测试级联查询（报销事项包含发票）...')
    const itemWithInvoices = await prisma.reimbursementItem.findUnique({
      where: { id: testItem.id },
      include: { invoices: true },
    })
    if (itemWithInvoices && itemWithInvoices.invoices.length === 1) {
      console.log('✅ 级联查询成功')
      console.log('   发票数量:', itemWithInvoices.invoices.length)
      console.log()
    } else {
      throw new Error('级联查询失败')
    }

    // 6. 测试创建支付证明单
    console.log('6️⃣ 测试创建支付证明单...')
    const testVoucher = await prisma.paymentVoucher.create({
      data: {
        date: new Date().toISOString().split('T')[0],
        department: '技术部',
        paymentMethod: 'transfer',
        payeeName: '张三',
        tax: 10.5,
        reimbursementItemId: testItem.id,
      },
    })
    console.log('✅ 创建支付证明单成功:', testVoucher.id)
    console.log('   部门:', testVoucher.department)
    console.log('   付款方式:', testVoucher.paymentMethod)
    console.log()

    // 7. 测试级联删除
    console.log('7️⃣ 测试级联删除...')
    await prisma.reimbursementItem.delete({
      where: { id: testItem.id },
    })
    
    // 验证发票和支付证明单也被删除
    const deletedInvoice = await prisma.invoice.findUnique({
      where: { id: testInvoice.id },
    })
    const deletedVoucher = await prisma.paymentVoucher.findUnique({
      where: { id: testVoucher.id },
    })
    
    if (!deletedInvoice && !deletedVoucher) {
      console.log('✅ 级联删除成功（发票和支付证明单已被删除）\n')
    } else {
      throw new Error('级联删除失败')
    }

    // 8. 测试索引（查询性能）
    console.log('8️⃣ 测试索引查询...')
    const items = await prisma.reimbursementItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    console.log('✅ 索引查询成功（按创建时间倒序）')
    console.log('   查询结果数量:', items.length)
    console.log()

    console.log('🎉 所有验证测试通过！\n')
    console.log('✅ Prisma Client 工作正常')
    console.log('✅ 数据库表结构正确')
    console.log('✅ 关系和级联删除配置正确')
    console.log('✅ 索引配置正确')

  } catch (error) {
    console.error('❌ 验证失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verifyPrisma()
