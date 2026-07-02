/** Seed proper formula data with full component structure */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DIAO_TEMPLATE = {
  diao: {
    "门框宽": { state: true, quantity: 2, materialName: "门框宽", track: "", formula: "=w+v", result: 0, v: 0, title: "", calculate: "=result-w", color: "lightgreen" },
    "门框高": { state: true, quantity: 4, materialName: "门框高", track: "", formula: "=h+v", result: 0, v: 0, title: "", calculate: "=result-h", color: "lightgreen" },
    "上方": { state: true, quantity: 2, materialName: "上方", track: "", formula: "=w-v", result: 0, v: 0, title: "", calculate: "=w-result", color: "yellow" },
    "下方": { state: true, quantity: 2, materialName: "下方", track: "", formula: "=w-v", result: 0, v: 0, title: "", calculate: "=w-result", color: "yellow" },
    "光企": { state: true, quantity: 4, materialName: "光企", track: "", formula: "=h-v", result: 0, v: 0, title: "", calculate: "=h-result", color: "yellow" },
    "玻璃宽": { state: true, quantity: 2, materialName: "玻璃宽", track: "", formula: "=上方.result-v", result: 0, v: 0, title: "", calculate: "=上方.result-result", color: "yellow" },
    "玻璃高": { state: true, quantity: 2, materialName: "玻璃高", track: "", formula: "=光企.result-v", result: 0, v: 0, title: "", calculate: "=光企.result-result", color: "yellow" },
    "扣板高": { state: true, quantity: 2, materialName: "扣板高", track: "", formula: "=h-v", result: 0, v: 0, title: "", calculate: "=h-result", color: "lightgreen" },
    "扣板宽": { state: true, quantity: 1, materialName: "扣板宽", track: "", formula: "=w-v", result: 0, v: 0, title: "", calculate: "=w-result", color: "lightgreen" },
    "扣板厚": { state: true, quantity: 1, materialName: "扣板厚", track: "", formula: "=t-v", result: 0, v: 0, title: "", calculate: "=t-result", color: "lightgreen" },
    "压条宽": { state: true, quantity: 2, materialName: "压条宽", track: "", formula: "=玻璃宽.result-v", result: 0, v: 0, title: "", calculate: "=玻璃宽.result-result", color: "yellow" },
    "压条高": { state: true, quantity: 2, materialName: "压条高", track: "", formula: "=玻璃高.result-v", result: 0, v: 0, title: "", calculate: "=玻璃高.result-result", color: "yellow" },
    "套线宽": { state: false, quantity: 2, materialName: "套线宽", track: "", formula: "=w+v", result: 0, v: 0, title: "", calculate: "", color: "lightblue" },
    "套线高": { state: false, quantity: 2, materialName: "套线高", track: "", formula: "=h+v", result: 0, v: 0, title: "", calculate: "", color: "lightblue" },
    _keyOrder: ["门框宽", "门框高", "上方", "下方", "光企", "玻璃宽", "玻璃高", "扣板高", "扣板宽", "扣板厚", "压条宽", "压条高", "套线宽", "套线高"],
  },
  lineType: ["标准", "加厚"],
  trackType: ["单轨", "双轨", "三轨"],
};

const PING_TEMPLATE = {
  ping: {
    "门框宽": { state: true, quantity: 2, materialName: "门框宽", track: "", formula: "=w+v", result: 0, v: 0, title: "", calculate: "=result-w", color: "lightgreen" },
    "门框高": { state: true, quantity: 4, materialName: "门框高", track: "", formula: "=h+v", result: 0, v: 0, title: "", calculate: "=result-h", color: "lightgreen" },
    "门扇宽": { state: true, quantity: 2, materialName: "门扇宽", track: "", formula: "=w-v", result: 0, v: 0, title: "", calculate: "=w-result", color: "yellow" },
    "门扇高": { state: true, quantity: 2, materialName: "门扇高", track: "", formula: "=h-v", result: 0, v: 0, title: "", calculate: "=h-result", color: "yellow" },
    "门芯板宽": { state: true, quantity: 2, materialName: "门芯板宽", track: "", formula: "=门扇宽.result-v", result: 0, v: 0, title: "", calculate: "=门扇宽.result-result", color: "orange" },
    "门芯板高": { state: true, quantity: 2, materialName: "门芯板高", track: "", formula: "=门扇高.result-v", result: 0, v: 0, title: "", calculate: "=门扇高.result-result", color: "orange" },
    "套线宽": { state: false, quantity: 2, materialName: "套线宽", track: "", formula: "=w+v", result: 0, v: 0, title: "", calculate: "", color: "lightblue" },
    "套线高": { state: false, quantity: 2, materialName: "套线高", track: "", formula: "=h+v", result: 0, v: 0, title: "", calculate: "", color: "lightblue" },
    _keyOrder: ["门框宽", "门框高", "门扇宽", "门扇高", "门芯板宽", "门芯板高", "套线宽", "套线高"],
  },
  lineType: ["标准", "加厚"],
  trackType: [],
};

const DS = 'smartdoor';

async function seed() {
  console.log('Seeding formulas with full component data...');

  const diaoFormulas = [
    { materialSize: '1000x2000', formulaId: 'diao_1000x2000', square: '2.0' },
    { materialSize: '1200x2100', formulaId: 'diao_1200x2100', square: '2.52' },
    { materialSize: '1500x2200', formulaId: 'diao_1500x2200', square: '3.3' },
  ];

  for (const d of diaoFormulas) {
    const formulaData = { ...DIAO_TEMPLATE, formulaName: d.materialSize, formulaType: 'diao', square: parseFloat(d.square) };
    await prisma.materialFormula.upsert({
      where: { databaseName_formulaId: { databaseName: DS, formulaId: d.formulaId } },
      update: {
        materialSize: d.materialSize,
        formulaType: 'diao',
        lineType: JSON.stringify(DIAO_TEMPLATE.lineType),
        trackType: JSON.stringify(DIAO_TEMPLATE.trackType),
        square: d.square,
        formulaData: JSON.stringify(formulaData),
      },
      create: {
        databaseName: DS, materialSize: d.materialSize, formulaId: d.formulaId,
        formulaType: 'diao',
        lineType: JSON.stringify(DIAO_TEMPLATE.lineType),
        trackType: JSON.stringify(DIAO_TEMPLATE.trackType),
        square: d.square,
        formulaData: JSON.stringify(formulaData),
      },
    });
    console.log(`  ✅ diao: ${d.formulaId}`);
  }

  const pingFormulas = [
    { materialSize: '900x2000', formulaId: 'ping_900x2000', square: '1.8' },
    { materialSize: '1000x2100', formulaId: 'ping_1000x2100', square: '2.1' },
    { materialSize: '1200x2200', formulaId: 'ping_1200x2200', square: '2.64' },
  ];

  for (const d of pingFormulas) {
    const formulaData = { ...PING_TEMPLATE, formulaName: d.materialSize, formulaType: 'ping', square: parseFloat(d.square) };
    await prisma.materialFormula.upsert({
      where: { databaseName_formulaId: { databaseName: DS, formulaId: d.formulaId } },
      update: {
        materialSize: d.materialSize,
        formulaType: 'ping',
        square: d.square,
        formulaData: JSON.stringify(formulaData),
      },
      create: {
        databaseName: DS, materialSize: d.materialSize, formulaId: d.formulaId,
        formulaType: 'ping',
        square: d.square,
        formulaData: JSON.stringify(formulaData),
      },
    });
    console.log(`  ✅ ping: ${d.formulaId}`);
  }

  await prisma.$disconnect();
  console.log('Done!');
}

seed().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
