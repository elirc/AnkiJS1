import { endOfLocalDay, startOfLocalDay } from '../../lib/dates';
import { db } from '../schema';

export async function newCardsStudiedToday(deckId: string, now: Date): Promise<number> {
  const start = startOfLocalDay(now).toISOString();
  const end = endOfLocalDay(now).toISOString();
  const logs = await db.review_logs.where('reviewed_at').between(start, end, true, false).toArray();
  const newLogs = logs.filter((log) => log.state_before === 'new');
  if (newLogs.length === 0) return 0;
  const cards = await db.cards.bulkGet(newLogs.map((log) => log.card_id));
  return cards.filter((card) => card?.deck_id === deckId).length;
}
