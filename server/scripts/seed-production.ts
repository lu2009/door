import { PrismaClient } from '@prisma/client';
import { seedDefaultLoginSettings, seedDefaultUser } from '../src/seed-default-user';
import { loadSeedEnv } from '../src/seed-env';

loadSeedEnv();

const prisma = new PrismaClient();

const PRODUCTION_REGISTRANT = {
  copy: { "FinalReceipt": 1, "ReceiptList": 1, "glass": 1, "glassHole": 1, "lable": 1, "product": 1, "product1": 1, "product10": 1, "product2": 1, "product3": 1, "product4": 1, "product5": 1, "product6": 1, "product7": 1, "product8": 1, "product9": 1, "receipt": 1 },
  custom_direction_names: {},
  declaration: "1、下单尺寸为包框尺寸洞口尺寸减去安装空位，如提供洞口尺寸、包边尺寸、见光尺寸、有直墙、不要边框、加长包边等，请明确说明，换算成下单尺寸以便生产。\n2、确认后，预付50%订金《加急需付全款)，出货前付清余款发货。\n3、正常订单确认后6小时内(加急单2小时内》允许修改订单，超过时间需另付工料费，如终止订单，定金不予退还。\n4、安装时所需玻璃胶 发泡胶 由客户自备",
  diao_column: { "五金": 0, "前包加长": 1, "单双丁": 1, "后包加长": 1, "封板高": 1, "打折": 1, "数量": 0, "洞尺": "1", "计价方式": 0 },
  diao_tabs: { "add": 1, "add_2": 0, "sheets": 1 },
  pagesize: { "FinalReceipt": "Microsoft Print to PDF", "ReceiptList": "导出为WPS PDF", "glass": "导出为WPS PDF", "glassHole": "导出为WPS PDF", "lable": "导出为WPS PDF", "product": "导出为WPS PDF", "product1": "导出为WPS PDF", "product10": "Gprinter GP-3120TUD", "product2": "导出为WPS PDF", "product3": "导出为WPS PDF", "product4": "Gprinter GP-3120TUD", "product5": "", "product6": "", "product7": "", "product8": "", "product9": "", "receipt": "导出为WPS PDF" },
  ping_column: { "showButton": 0, "五金": 1, "前包加长": 1, "单双丁": 1, "吊脚": 10, "后包加长": 1, "套线种类": 1, "封板高": 1, "平方数": 0, "开向模式": 1, "打折": 0, "洞尺": "1", "轨道种类": 0, "锁向": 1 },
  ping_tabs: { "add": 0, "add_2": 0, "sheets": 1 },
  template: { "FinalReceipt": "FinalReceipt", "ReceiptList": "ReceiptList", "glass": "glass", "glassHole": "glassHole", "lable": "lable", "product": "product", "product1": "product1", "product10": "product10", "product2": "product2", "product3": "product3", "product4": "product4", "product5": "product5", "product6": "product6", "product7": "product7", "product8": "product8", "product9": "product9", "receipt": "receipt" },
};

async function main() {
  console.log('Seeding default user...');
  await seedDefaultUser(prisma);
  console.log('  ✅ default user');
  await seedDefaultLoginSettings(prisma);
  console.log('  ✅ default login settings');

  console.log('Seeding production registrant config...');
  for (const [key, value] of Object.entries(PRODUCTION_REGISTRANT)) {
    const jsonStr = JSON.stringify(value, null, 2);
    await prisma.setting.upsert({
      where: { databaseName_key: { databaseName: 'smartdoor', key } },
      update: { value: jsonStr },
      create: { databaseName: 'smartdoor', key, value: jsonStr },
    });
    console.log(`  ✅ ${key}`);
  }
  console.log('Done!');
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
