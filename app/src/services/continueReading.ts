import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@atmik/continue_reading_v1';
const LIMIT = 2;

export type ContinueReading = {
  id: string;
  type: 'BOOK' | 'ARTICLE';
  title: string;
  author?: string;
  coverUrl?: string;
  fileUrl?: string;
  description?: string;
  readTime?: string | number;
  page?: number;
  totalPages?: number;
};

export async function rememberContinue(item: ContinueReading): Promise<void> {
  if (!item.id) return;
  try {
    const existing = await getContinueReading();
    const next = [item, ...existing.filter((entry) => entry.id !== item.id)].slice(0, LIMIT);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Failed to remember reading', error);
  }
}

export async function getContinueReading(): Promise<ContinueReading[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed?.id ? [parsed] : [];
    return list.filter((entry) => entry?.id).slice(0, LIMIT);
  } catch {
    return [];
  }
}
