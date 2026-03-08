import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';

const { width } = Dimensions.get('window');

// --- Типы ---
type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextData {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

// --- Контекст ---
const ToastContext = createContext<ToastContextData>({} as ToastContextData);

// --- Провайдер и Компонент ---
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeColors = useThemeColors();
  const [visible, setVisible] = useState(false);
  const [toastData, setToastData] = useState<ToastOptions | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const insets = useSafeAreaInsets();
  const animatedValue = useRef(new Animated.Value(-100)).current;

  // Логика скрытия
  const hideToast = useCallback(() => {
    setVisible(false);
    if (timeoutId) clearTimeout(timeoutId);

    Animated.timing(animatedValue, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [timeoutId, animatedValue]);

  // Логика показа
  const showToast = useCallback(
    ({ message, type = 'info', duration = 3000 }: ToastOptions) => {
      if (timeoutId) clearTimeout(timeoutId);

      setToastData({ message, type, duration });
      setVisible(true);

      // Анимация появления
      Animated.spring(animatedValue, {
        toValue: insets.top + spacing.sm,
        useNativeDriver: true,
        bounciness: 8,
      }).start();

      const id = setTimeout(() => {
        setVisible(false);
        Animated.timing(animatedValue, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, duration);

      setTimeoutId(id);
    },
    [timeoutId, insets.top, animatedValue]
  );

  // Темы оформления
  const getTheme = () => {
    if (!toastData) return null;
    switch (toastData.type) {
      case 'success':
        return {
          bg: colors.successLight,
          border: colors.successBorder,
          text: colors.successText,
          icon: 'checkmark-circle',
          iconColor: colors.success,
        };
      case 'error':
        return {
          bg: colors.errorLightAlt,
          border: colors.errorBorder,
          text: colors.errorText,
          icon: 'alert-circle',
          iconColor: themeColors.destructive,
        };
      default:
        return {
          bg: colors.infoLight,
          border: colors.infoBorder,
          text: colors.infoText,
          icon: 'information-circle',
          iconColor: colors.info,
        };
    }
  };

  const theme = getTheme();

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}

      {toastData && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY: animatedValue }],
              backgroundColor: theme?.bg,
              borderColor: theme?.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.content}
            onPress={hideToast}
            activeOpacity={0.9}
          >
            <Ionicons name={theme?.icon as any} size={24} color={theme?.iconColor} />
            <Text style={[styles.text, { color: theme?.text }]}>{toastData.message}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: 350,
        left: '50%',
        marginLeft: -175,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: '600',
    lineHeight: 18,
  },
});
