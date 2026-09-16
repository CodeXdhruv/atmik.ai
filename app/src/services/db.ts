import AsyncStorage from '@react-native-async-storage/async-storage';


export type ReflectionRecord = {
  id: string;
  type: 'todays_reflection' | 'look_within' | 'wisdom' | 'conversation';
  contentId: string;
  theme?: string;
  question?: string;
  userResponse?: string;
  atmikResponse?: string;
  createdAt: string;
};

const DB_KEY = '@atmik/d1_mock/reflections';

class DBService {
  /**
   * Persist a reflection moment to D1 (mocked with AsyncStorage).
   */
  async saveReflection(data: Omit<ReflectionRecord, 'id' | 'createdAt'>): Promise<ReflectionRecord> {
    try {
      const existingStr = await AsyncStorage.getItem(DB_KEY);
      const existing: ReflectionRecord[] = existingStr ? JSON.parse(existingStr) : [];
      
      const newRecord: ReflectionRecord = {
        ...data,
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        createdAt: new Date().toISOString(),
      };
      
      const updated = [newRecord, ...existing];
      await AsyncStorage.setItem(DB_KEY, JSON.stringify(updated));
      return newRecord;
    } catch (e) {
      console.error('Failed to save reflection to D1 queue', e);
      throw e;
    }
  }

  /**
   * Fetch recent reflections (for Journey page preview)
   */
  async getRecentReflections(limit: number = 3): Promise<ReflectionRecord[]> {
    try {
      const existingStr = await AsyncStorage.getItem(DB_KEY);
      const existing: ReflectionRecord[] = existingStr ? JSON.parse(existingStr) : [];
      // Sort by latest (already unshifted, but ensure sort)
      existing.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return existing.slice(0, limit);
    } catch (e) {
      console.error('Failed to fetch recent reflections', e);
      return [];
    }
  }

  /**
   * Fetch a specific reflection by content ID and type to check completion status
   */
  async getReflectionByContentId(contentId: string, type: string): Promise<ReflectionRecord | null> {
    try {
      const existingStr = await AsyncStorage.getItem(DB_KEY);
      const existing: ReflectionRecord[] = existingStr ? JSON.parse(existingStr) : [];
      const match = existing.find(r => r.contentId === contentId && r.type === type);
      return match || null;
    } catch (e) {
      console.error('Failed to fetch reflection by contentId', e);
      return null;
    }
  }

  /**
   * Fetch paginated history (for Your Reflections screen)
   */
  async getReflectionsHistory(page: number = 1, limit: number = 20): Promise<ReflectionRecord[]> {
    try {
      const existingStr = await AsyncStorage.getItem(DB_KEY);
      const existing: ReflectionRecord[] = existingStr ? JSON.parse(existingStr) : [];
      existing.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const startIndex = (page - 1) * limit;
      return existing.slice(startIndex, startIndex + limit);
    } catch (e) {
      console.error('Failed to fetch reflections history', e);
      return [];
    }
  }
  
  /**
   * Clear history (for testing purposes)
   */
  async clearHistory(): Promise<void> {
    await AsyncStorage.setItem(DB_KEY, JSON.stringify([]));
  }
}

export const dbService = new DBService();
