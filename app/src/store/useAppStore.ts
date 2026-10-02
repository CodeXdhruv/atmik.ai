import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();

const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    return storage.set(name, value);
  },
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return storage.remove(name);
  },
};

interface AppState {
  hasCompletedOnboarding: boolean;
  userName: string;
  bookmarks: string[];
  setHasCompletedOnboarding: (status: boolean) => void;
  setUserName: (name: string) => void;
  toggleBookmarkLocal: (contentId: string) => void;
  setBookmarks: (bookmarks: string[]) => void;
  clearStore: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      userName: 'Rahul',
      bookmarks: [],
      setHasCompletedOnboarding: (status) => set({ hasCompletedOnboarding: status }),
      setUserName: (name) => set({ userName: name }),
      toggleBookmarkLocal: (contentId) => set((state) => {
        const exists = state.bookmarks.includes(contentId);
        return {
          bookmarks: exists 
            ? state.bookmarks.filter(id => id !== contentId)
            : [...state.bookmarks, contentId]
        };
      }),
      setBookmarks: (bookmarks) => set({ bookmarks }),
      clearStore: () => set({ hasCompletedOnboarding: false, userName: '', bookmarks: [] }),
    }),
    {
      name: 'dr-atmik-ai-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
