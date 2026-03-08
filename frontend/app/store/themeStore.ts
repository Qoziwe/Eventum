import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
    theme: ThemeMode;
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (theme: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'light',
            isDark: false,

            toggleTheme: () => {
                const newTheme = get().theme === 'light' ? 'dark' : 'light';
                set({ theme: newTheme, isDark: newTheme === 'dark' });
            },

            setTheme: (theme: ThemeMode) => {
                set({ theme, isDark: theme === 'dark' });
            },
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ theme: state.theme }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.isDark = state.theme === 'dark';
                }
            },
        }
    )
);

/**
 * Hook that returns theme-aware color palette.
 * Use this instead of `colors.light` or `colors.dark` directly.
 */
export function useThemeColors() {
    const theme = useThemeStore((s) => s.theme);
    return theme === 'dark' ? colors.dark : colors.light;
}
