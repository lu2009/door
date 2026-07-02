/**
 * Serializer: converts database records to API response format with Chinese field names.
 * Mirrors the original Flask serializer behavior.
 */

import { safeLoads } from './helpers';

interface FieldMap {
  [dbField: string]: string;  // dbField -> apiField
}

const FIELD_MAPS: Record<string, FieldMap> = {};

// This is a simplified adapter. For production, use a more complete mapping.
export function serialize<T extends Record<string, unknown>>(obj: T | T[] | null, extra?: Record<string, unknown>): unknown {
  if (!obj) return null;
  if (Array.isArray(obj)) return obj.map(item => serialize(item, extra));

  // For now, return the object as-is with code/200 wrapper fields
  const result: Record<string, unknown> = { ...obj, ...extra };

  // Add Chinese alias fields for common models
  if (result.customerName !== undefined) {
    result.客户 = result.customerName;
    result.回执单号 = result.orderNo;
  }

  return result;
}

/**
 * Build a print row from door spec data (matches original _build_print_row)
 */
export function buildPrintRow(
  row: Record<string, unknown>,
  orderResult: Record<string, unknown>,
  orderNo: string
): Record<string, unknown> {
  const profile = (row.型材 as string) || '';
  const color = (row.颜色 as string) || '';
  const lineNo = (row.单号 as string) || '';
  const direction = (row.开向 as string) || '';
  const sleeveType = (row.套线种类 as string) || '';

  return {
    profile: lineNo ? `${profile}<br>${lineNo}` : profile,
    profile2: color ? `${profile}<br>${color}` : profile,
    direction: sleeveType ? `${sleeveType}${direction}` : direction,
    openImg: row.openImg || '',
    date: row.日期 || orderResult.日期 || orderResult.orderDate || '',
    payment: row.payment || '',
    price: Number(row.单价) > 0 ? row.单价 : '/',
    color,
    glass: buildGlassText(row),
    size: buildSizeText(row),
    quantity: row.数量 || 0,
    amount: Math.round(Number(row.金额) || 0),
    pricing: buildPricingText(row),
    remark: [row.轨道种类, row.五金, row.安装地址, row.备注].filter(Boolean).join('<br>'),
    maker: orderResult.打单人 || '',
    doorImg: row.doorImg || row.imageUrl || '',
    client: row.客户 || orderResult.客户 || '',
  };
}

function buildGlassText(row: Record<string, unknown>): string {
  const bottom = (row.底玻 as string) || '';
  const face = (row.面玻 as string) || '';
  const thickness = (row.玻璃厚 as string) || '';
  if (bottom === '无' && face === '无') return '无玻璃';
  if (bottom === '无' && face) {
    const suffix = thickness && Number(thickness) > 0 ? `*${thickness}mm` : '';
    return `单玻:${face}${suffix}`;
  }
  if (bottom || face) {
    const suffix = thickness && Number(thickness) > 0 ? `*${thickness}mm` : '';
    return `底玻:${bottom}<br>面玻:${face}${suffix}`;
  }
  return '';
}

function buildSizeText(row: Record<string, unknown>): string {
  const parts: string[] = [];
  const height = row.门洞高;
  const width = row.门洞宽;
  if (height) parts.push(`高:${height}`);
  if (width) parts.push(`宽:${width}`);
  for (const [label, key] of [['亮高', '亮窗总高'], ['墙厚', '墙厚'], ['吊脚', '吊脚'], ['轨道长', '轨道长']]) {
    const val = row[key as string];
    if (val && Number(val) > 0) parts.push(`${label}:${val}`);
  }
  const size = parts.join('<br/>');
  const holeSize = row.洞尺 as string;
  return holeSize && size ? `${holeSize}<br>${size}` : (holeSize || size);
}

function buildPricingText(row: Record<string, unknown>): string {
  const unitPrice = Number(row.单价) || 0;
  const quantity = Number(row.数量) || 0;
  const pricingType = (row.计价方式 as string) || '';
  const square = Number(row.平方数) || 0;
  const amount = Number(row.金额) || 0;
  if (unitPrice <= 0) return (row.加价项目 as string) || '';
  if (pricingType === '方' && square > 0) {
    return `•${row.单价}元/方*${square.toFixed(3)}=${amount.toFixed(2)}元`;
  }
  if (quantity > 0) {
    return `•${row.单价}元/套*${quantity}=${amount.toFixed(2)}元`;
  }
  return `•${row.单价}元`;
}
