import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'practice-storage' });

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

export interface Habit {
  id: string;
  label: string;
  completed: boolean;
}

interface PracticeState {
  habits: Habit[];
  setHabits: (habits: Habit[]) => void;
  toggleHabit: (id: string) => void;
  addHabit: (label: string) => void;
  
  journalText: string;
  journalSaved: boolean;
  setJournalText: (text: string) => void;
  setJournalSaved: (saved: boolean) => void;

  gratitudes: string[];
  setGratitudes: (gratitudes: string[]) => void;
  updateGratitude: (text: string, index: number) => void;

  seenQuoteIds: string[];
  currentDailyQuotes: any[];
  lastQuoteRefreshDate: string;
  setSeenQuoteIds: (ids: string[]) => void;
  setCurrentDailyQuotes: (quotes: any[]) => void;
  setLastQuoteRefreshDate: (date: string) => void;
  lastUpdated: number;
  checkAndResetDaily: () => void;
}

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set) => ({
      habits: [
        { id: '1', label: 'Meditation', completed: false },
        { id: '2', label: 'Drink Water', completed: false },
        { id: '3', label: 'Walk', completed: false },
        { id: '4', label: 'Read Wisdom', completed: false },
        { id: '5', label: 'Journal', completed: false },
      ],
      setHabits: (habits) => set({ habits }),
      toggleHabit: (id) => set((state) => ({
        habits: state.habits.map(h => h.id === id ? { ...h, completed: !h.completed } : h)
      })),
      addHabit: (label) => set((state) => ({
        habits: [...state.habits, { id: Math.random().toString(), label, completed: false }]
      })),
      
      journalText: '',
      journalSaved: false,
      setJournalText: (text) => set({ journalText: text }),
      setJournalSaved: (saved) => set({ journalSaved: saved }),

      gratitudes: ['', '', ''],
      seenQuoteIds: [],
      currentDailyQuotes: [],
      lastQuoteRefreshDate: '',
      setGratitudes: (gratitudes) => set({ gratitudes }),
      updateGratitude: (text, index) => set((state) => {
        const newG = [...state.gratitudes];
        newG[index] = text;
        return { gratitudes: newG };
      }),
      setSeenQuoteIds: (ids) => set({ seenQuoteIds: ids }),
      setCurrentDailyQuotes: (quotes) => set({ currentDailyQuotes: quotes }),
      setLastQuoteRefreshDate: (date) => set({ lastQuoteRefreshDate: date }),
      
      lastUpdated: new Date().setHours(0, 0, 0, 0),
      checkAndResetDaily: () => set((state) => {
        const today = new Date().setHours(0, 0, 0, 0);
        if (!state.lastUpdated || state.lastUpdated < today) {
          // It's a new day! Reset completions but keep the habit list
          return {
            habits: state.habits.map(h => ({ ...h, completed: false })),
            journalText: '',
            journalSaved: false,
            gratitudes: ['', '', ''],
            lastUpdated: today,
          };
        }
        return {};
      }),
    }),
    {
      name: 'practice-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
