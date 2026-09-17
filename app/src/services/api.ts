import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://atmik-ai-backend.swatantra-backend.workers.dev';
const CACHE_KEY_CONTENT = '@atmik_cache_library_content';
const CACHE_KEY_CATEGORIES = '@atmik_cache_library_categories';
const CACHE_KEY_JOURNEY = '@atmik_cache_todays_journey';

// In-memory cache for instant synchronous access within the same session
let memoryContentCache: any[] | null = null;
let memoryCategoryCache: any[] | null = null;
let memoryJourneyCache: any | null = null;

const getAuthHeaders = async () => {
  let token = 'temp-user-token';
  try {
    const currentUser = auth().currentUser;
    if (currentUser) {
      token = await currentUser.getIdToken(false);
    }
  } catch (err) {
    console.warn("Could not get Firebase token, using fallback token:", err);
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const apiService = {
  /**
   * Get cached library content instantly from memory or AsyncStorage
   */
  async getCachedLibraryContent(): Promise<any[]> {
    if (memoryContentCache && memoryContentCache.length > 0) {
      return memoryContentCache;
    }
    try {
      const stored = await AsyncStorage.getItem(CACHE_KEY_CONTENT);
      if (stored) {
        memoryContentCache = JSON.parse(stored);
        return memoryContentCache || [];
      }
    } catch (e) {}
    return [];
  },

  /**
   * Get cached categories instantly from memory or AsyncStorage
   */
  async getCachedCategories(): Promise<any[]> {
    if (memoryCategoryCache && memoryCategoryCache.length > 0) {
      return memoryCategoryCache;
    }
    try {
      const stored = await AsyncStorage.getItem(CACHE_KEY_CATEGORIES);
      if (stored) {
        memoryCategoryCache = JSON.parse(stored);
        return memoryCategoryCache || [];
      }
    } catch (e) {}
    return [];
  },

  /**
   * Fetch all content from the library with background cache persistence
   */
  async fetchLibraryContent(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/library/content`, {
        method: 'GET',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) {
        console.error("Failed to fetch library content:", response.status);
        return await this.getCachedLibraryContent();
      }
      const data = await response.json();
      const content = data.data || [];
      
      // Update memory & persistent cache
      memoryContentCache = content;
      AsyncStorage.setItem(CACHE_KEY_CONTENT, JSON.stringify(content)).catch(() => {});

      return content;
    } catch (error) {
      console.error("Error fetching library content:", error);
      return await this.getCachedLibraryContent();
    }
  },

  async fetchCategories(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/library/categories`, {
        method: 'GET',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) {
        console.error("Failed to fetch library categories:", response.status);
        return await this.getCachedCategories();
      }
      const data = await response.json();
      const categories = data.data || [];

      // Update memory & persistent cache
      memoryCategoryCache = categories;
      AsyncStorage.setItem(CACHE_KEY_CATEGORIES, JSON.stringify(categories)).catch(() => {});

      return categories;
    } catch (error) {
      console.error("Error fetching library categories:", error);
      return await this.getCachedCategories();
    }
  },

  fetchQuotesPool: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/library/quotes`, {
        method: 'GET',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) {
        console.error("Failed to fetch quotes pool:", response.status);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      console.error("Error fetching quotes pool:", error);
      return [];
    }
  },

  /**
   * Get cached journey bundle instantly from memory or AsyncStorage
   */
  async getCachedTodaysJourney(): Promise<any> {
    if (memoryJourneyCache) {
      return memoryJourneyCache;
    }
    try {
      const stored = await AsyncStorage.getItem(CACHE_KEY_JOURNEY);
      if (stored) {
        memoryJourneyCache = JSON.parse(stored);
        return memoryJourneyCache;
      }
    } catch (e) {}
    return null;
  },

  /**
   * Fetch today's dynamic journey bundle for Inner Journey (Practice screen)
   */
  async fetchTodaysJourney() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/journey/today?t=${Date.now()}`, {
        method: 'GET',
        headers: await getAuthHeaders(),
        cache: 'no-store',
      });
      if (!response.ok) {
        console.warn("Could not fetch today's journey bundle, fallback to local:", response.status);
        return await this.getCachedTodaysJourney();
      }
      const resData = await response.json();
      if (resData.success && resData.data) {
        memoryJourneyCache = resData.data;
        AsyncStorage.setItem(CACHE_KEY_JOURNEY, JSON.stringify(resData.data)).catch(() => {});
        return resData.data;
      }
      return await this.getCachedTodaysJourney();
    } catch (error) {
      console.warn("Error fetching today's journey bundle:", error);
      return await this.getCachedTodaysJourney();
    }
  },

  /**
   * Fetch today's dynamic micro-experience for For You Today card
   * Content stays exact same throughout the day and rotates after 12:00 AM midnight
   */
  async fetchTodaysForYou(forceRefresh = false) {
    try {
      const todayStr = new Date().toDateString();
      const LAST_DATE_KEY = '@atmik/for_you_today/last_date';
      const CURRENT_ITEM_KEY = '@atmik/for_you_today/current_item';

      if (!forceRefresh) {
        try {
          const storedDate = await AsyncStorage.getItem(LAST_DATE_KEY);
          const storedItemStr = await AsyncStorage.getItem(CURRENT_ITEM_KEY);
          if (storedDate === todayStr && storedItemStr) {
            const storedItem = JSON.parse(storedItemStr);
            if (storedItem && storedItem.question) {
              return storedItem;
            }
          }
        } catch (e) {}
      }

      let seenQuery = '';
      try {
        const historyStr = await AsyncStorage.getItem('@atmik/for_you_today/history_v1');
        const completedIds: string[] = historyStr ? JSON.parse(historyStr) : [];
        if (completedIds.length > 0) {
          seenQuery = `&seen=${encodeURIComponent(completedIds.join(','))}`;
        }
      } catch (e) {}

      const response = await fetch(`${API_BASE_URL}/api/for-you/today?t=${Date.now()}${seenQuery}`, {
        method: 'GET',
        headers: await getAuthHeaders(),
        cache: 'no-store',
      });
      if (!response.ok) {
        console.warn("Could not fetch today's for-you item, fallback to local:", response.status);
        const storedItemStr = await AsyncStorage.getItem(CURRENT_ITEM_KEY);
        if (storedItemStr) return JSON.parse(storedItemStr);
        return null;
      }
      const resData = await response.json();

      if (resData.resetHistory) {
        AsyncStorage.setItem('@atmik/for_you_today/history_v1', JSON.stringify([])).catch(() => {});
      }

      if (resData.success && resData.data) {
        AsyncStorage.setItem(LAST_DATE_KEY, todayStr).catch(() => {});
        AsyncStorage.setItem(CURRENT_ITEM_KEY, JSON.stringify(resData.data)).catch(() => {});
        return resData.data;
      }

      return null;
    } catch (error) {
      console.warn("Error fetching today's for-you item:", error);
      return null;
    }
  },
};
