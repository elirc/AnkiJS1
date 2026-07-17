import { db } from '../schema';

export async function getMeta(key: string): Promise<string | undefined> {
  return (await db.sync_meta.get(key))?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.sync_meta.put({ key, value });
}

export async function deleteMeta(key: string): Promise<void> {
  await db.sync_meta.delete(key);
}
