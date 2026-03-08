import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeStore, useThemeColors } from '../store/themeStore';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const themeColors = useThemeColors();
  const { isDark, toggleTheme } = useThemeStore();

  const sections = [
    { id: 'acc', title: 'Аккаунт', icon: 'person-outline' },
    { id: 'notif', title: 'Уведомления', icon: 'notifications-outline' },
    { id: 'priv', title: 'Приватность', icon: 'lock-closed-outline' },
    { id: 'lang', title: 'Язык', icon: 'globe-outline' },
    { id: 'help', title: 'Помощь', icon: 'help-circle-outline' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>Настройки</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {/* Theme Toggle */}
        <View style={[styles.item, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Ionicons
            name={isDark ? 'moon' : 'sunny-outline'}
            size={20}
            color={themeColors.primary}
          />
          <Text style={[styles.itemText, { color: themeColors.foreground }]}>Тёмная тема</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: themeColors.input, true: themeColors.primary }}
            thumbColor={colors.white}
          />
        </View>

        {sections.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.item, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
          >
            <Ionicons name={s.icon as any} size={20} color={themeColors.primary} />
            <Text style={[styles.itemText, { color: themeColors.foreground }]}>{s.title}</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={themeColors.mutedForeground}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: typography.xl, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    gap: spacing.md,
  },
  itemText: { flex: 1, fontWeight: '600' },
});
