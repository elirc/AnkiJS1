import type { ISODate } from '../db/schema';

export function nowISO(date = new Date()): ISODate {
  return date.toISOString();
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
}

export function isSameOrBefore(a: ISODate, b: Date): boolean {
  return new Date(a).getTime() <= b.getTime();
}

export function relativeAge(iso: ISODate, now = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function formatDue(iso: ISODate): string {
  const due = new Date(iso);
  const now = new Date();
  if (due.getTime() <= now.getTime()) return 'Due';
  if (due.toDateString() === now.toDateString()) {
    return due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return due.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function humanIntervalFromMs(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = days / 30;
  return `${months.toFixed(months >= 10 ? 0 : 1)}mo`;
}

export function localDateStamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
