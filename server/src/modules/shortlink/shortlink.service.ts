import { prisma } from '../../database';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = process.env.SHORT_LINK_BASE_URL || '/s';

export async function create(payload?: string) {
  if (!payload) return { code: 200, id: 'smartdoor' };
  const id = uuidv4().slice(0, 8);
  await prisma.shortLink.create({ data: { id, url: payload } });
  return { code: 200, id };
}

export async function get(linkId: string) {
  const link = await prisma.shortLink.findUnique({ where: { id: linkId } });
  if (!link) return { code: 404, msg: 'not found' };
  return { code: 200, data: { id: link.id, url: link.url, created_at: link.createdAt?.toISOString() } };
}
