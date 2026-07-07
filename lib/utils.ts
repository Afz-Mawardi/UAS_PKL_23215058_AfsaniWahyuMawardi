import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseIndonesianDate(dateStr: string): Date {
  const months: { [key: string]: number } = {
    'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
    'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'agu': 7,
    'sep': 8, 'okt': 9, 'nov': 10, 'des': 11
  };
  const parts = dateStr.toLowerCase().split(' ');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthName = parts[1];
    const year = parseInt(parts[2], 10);
    const month = months[monthName] !== undefined ? months[monthName] : 0;
    return new Date(year, month, day);
  }
  return new Date(0);
}

export function sortItemsByDateTime(a: any, b: any): number {
  // 1. Compare Date
  let dateA = 0;
  let dateB = 0;
  try {
    if (a.date) dateA = parseIndonesianDate(a.date).getTime();
  } catch {}
  try {
    if (b.date) dateB = parseIndonesianDate(b.date).getTime();
  } catch {}

  if (dateA !== dateB) {
    return dateB - dateA; // Newest date first
  }

  // 2. Compare Time (if exists, e.g. for events)
  if (a.time || b.time) {
    const parseTime = (timeStr?: string): string => {
      if (!timeStr) return '00:00';
      const parts = timeStr.split('-');
      return parts[0] ? parts[0].trim().replace(/[^0-9:]/g, '') : '00:00';
    };
    const startA = parseTime(a.time);
    const startB = parseTime(b.time);
    if (startA !== startB) {
      return startB.localeCompare(startA); // Latest time first (e.g. 15:00 before 08:00)
    }
  }

  // 3. Fallback to createdAt or timestamp in ID
  const getFallbackTimestamp = (item: any): number => {
    if (item.createdAt) {
      const t = new Date(item.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    if (item.id && typeof item.id === 'string') {
      const match = item.id.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (val > 946684800000) return val;
      }
    }
    return 0;
  };

  const tsA = getFallbackTimestamp(a);
  const tsB = getFallbackTimestamp(b);
  return tsB - tsA; // Most recently added first
}
