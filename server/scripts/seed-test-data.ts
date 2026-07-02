import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test data...');

  // Create a test order with progress
  const order = await prisma.order.upsert({
    where: { databaseName_orderNo: { databaseName: 'smartdoor', orderNo: 'DD20260626TEST' } },
    update: {},
    create: {
      databaseName: 'smartdoor',
      orderNo: 'DD20260626TEST',
      customerName: '测试客户',
      doorType: 'ping',
      doorCount: 1,
      status: 'processing',
      doorSpecs: JSON.stringify({ ping_hui: [{ 型材: '钛镁合金', 数量: 1, 单价: 2000 }], diao_hui: [] }),
    },
  });
  console.log(`Order created: ${order.id}`);

  // Create progress record
  await prisma.progress.upsert({
    where: { databaseName_orderId_procedureName: { databaseName: 'smartdoor', orderId: order.id, procedureName: '工序1' } },
    update: { procedureStatus: 'completed' },
    create: {
      databaseName: 'smartdoor',
      orderId: order.id,
      orderNo: order.orderNo,
      customerName: order.customerName,
      procedureName: '工序1',
      procedureStatus: 'completed',
      operatorName: '测试',
    },
  });
  console.log('Progress created');

  // Create finance order
  await prisma.financeOrder.upsert({
    where: { databaseName_orderNo: { databaseName: 'smartdoor', orderNo: 'DD20260626TEST' } },
    update: {},
    create: {
      databaseName: 'smartdoor',
      orderId: order.id,
      orderNo: order.orderNo,
      customerName: order.customerName,
      allocatedAmount: 2000,
      unpaidAmount: 0,
      monthTag: '2026-06',
      statusText: '已结清',
    },
  });
  console.log('Finance order created');

  await prisma.$disconnect();
  console.log('Done! Test data seeded successfully.');
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
