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
  setHasCompletedOnboarding: (status: boolean) => void;
  setUserName: (name: string) => void;
  clearStore: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      userName: 'Rahul',
      setHasCompletedOnboarding: (status) => set({ hasCompletedOnboarding: status }),
      setUserName: (name) => set({ userName: name }),
      clearStore: () => set({ hasCompletedOnboarding: false, userName: '' }),
    }),
    {
      name: 'dr-atmik-ai-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
