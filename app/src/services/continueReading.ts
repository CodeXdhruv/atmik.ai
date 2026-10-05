import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@atmik/continue_reading_v1';
const DONE_KEY = '@atmik/continue_completed_v1';
const LIMIT = 24;

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

async function completedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(DONE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export async function rememberContinue(item: ContinueReading): Promise<void> {
  if (!item.id) return;
  try {
    const done = await completedIds();
    if (done.has(item.id)) return;
    const existing = await getContinueReading();
    const next = [item, ...existing.filter((entry) => entry.id !== item.id)].slice(0, LIMIT);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Failed to remember reading', error);
  }
}

export async function completeContinue(id: string): Promise<void> {
  if (!id) return;
  try {
    const done = await completedIds();
    done.add(id);
    await AsyncStorage.setItem(DONE_KEY, JSON.stringify([...done]));
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    await AsyncStorage.setItem(KEY, JSON.stringify(list.filter((entry) => entry?.id !== id)));
  } catch (error) {
    console.warn('Failed to complete reading', error);
  }
}

export async function getContinueReading(): Promise<ContinueReading[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed?.id ? [parsed] : [];
    const done = await completedIds();
    return list.filter((entry) => entry?.id && !done.has(entry.id)).slice(0, LIMIT);
  } catch {
    return [];
  }
}
