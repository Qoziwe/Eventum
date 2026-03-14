import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeStore, useThemeColors } from '../store/themeStore';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const themeColors = useThemeColors();
  const { isDark, toggleTheme } = useThemeStore();

  const [activeModal, setActiveModal] = React.useState<string | null>(null);

  const handleSectionPress = (id: string) => {
    setActiveModal(id);
  };

  const getModalTitle = (id: string | null) => {
    return sections.find(s => s.id === id)?.title || 'Настройки';
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case 'acc':
        return <Text style={[styles.modalText, { color: themeColors.foreground }]}>Настройки аккаунта (смена пароля, удаление профиля) находятся в разработке для этой версии.</Text>;
      case 'notif':
        return (
          <View style={{ gap: 16 }}>
            <View style={styles.settingRow}>
              <Text style={[styles.modalText, { color: themeColors.foreground }]}>Push-уведомления</Text>
              <Switch value={true} thumbColor={colors.white} trackColor={{ true: themeColors.primary, false: themeColors.border }} />
            </View>
            <View style={styles.settingRow}>
              <Text style={[styles.modalText, { color: themeColors.foreground }]}>Email-рассылка</Text>
              <Switch value={false} thumbColor={colors.white} trackColor={{ true: themeColors.primary, false: themeColors.border }} />
            </View>
          </View>
        );
      case 'priv':
        return <Text style={[styles.modalText, { color: themeColors.foreground }]}>Ваш профиль открыт для всех пользователей площадки. Чтобы скрыть профиль, пожалуйста, обратитесь в поддержку.</Text>;
      case 'lang':
        return (
          <View>
            <TouchableOpacity style={styles.settingRow}>
              <Text style={[styles.modalText, { color: themeColors.primary, fontWeight: '700' }]}>Русский (Текущий)</Text>
              <Ionicons name="checkmark" size={20} color={themeColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow}>
              <Text style={[styles.modalText, { color: themeColors.foreground }]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow}>
              <Text style={[styles.modalText, { color: themeColors.foreground }]}>Қазақша</Text>
            </TouchableOpacity>
          </View>
        );
      case 'help':
        return <Text style={[styles.modalText, { color: themeColors.foreground }]}>В случае возникновения вопросов или трудностей, пожалуйста, напишите на нашу почту: support@eventum.com</Text>;
      default:
        return null;
    }
  };

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
            onPress={() => handleSectionPress(s.id)}
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

      <Modal visible={!!activeModal} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>{getModalTitle(activeModal)}</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={24} color={themeColors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingVertical: spacing.md }}>
              {renderModalContent()}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    paddingBottom: spacing.md,
  },
  modalText: {
    fontSize: typography.base,
    lineHeight: 22,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  }
});
