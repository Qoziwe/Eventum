import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { useToast } from '../components/ToastProvider';
import { validatePhone, formatPhone, sanitizeText } from '../utils/security';
import { validateBirthDate } from '../utils/dateUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  id: `d${i + 1}`,
  label: `${i + 1}`,
  value: (i + 1).toString().padStart(2, '0'),
}));

const MONTHS = [
  { id: 'm0', label: 'Января', value: '01' },
  { id: 'm1', label: 'Февраля', value: '02' },
  { id: 'm2', label: 'Марта', value: '03' },
  { id: 'm3', label: 'Апреля', value: '04' },
  { id: 'm4', label: 'Мая', value: '05' },
  { id: 'm5', label: 'Июня', value: '06' },
  { id: 'm6', label: 'Июля', value: '07' },
  { id: 'm7', label: 'Августа', value: '08' },
  { id: 'm8', label: 'Сентября', value: '09' },
  { id: 'm9', label: 'Октября', value: '10' },
  { id: 'm10', label: 'Ноября', value: '11' },
  { id: 'm11', label: 'Декабря', value: '12' },
];

const YEARS = Array.from({ length: 80 }, (_, i) => {
  const year = 2024 - i;
  return { id: `y${year}`, label: `${year}`, value: `${year}` };
});

export default function EditStudioScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation();
  const { user, updateProfile, uploadAvatar, clearAllData, logout } = useUserStore();
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Убираем фокус с элементов при открытии экрана на веб-платформе
  useEffect(() => {
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined' && window.document) {
          const activeElement = window.document.activeElement as HTMLElement;
          if (activeElement && activeElement.blur) {
            const hiddenParent = activeElement.closest('[aria-hidden="true"]');
            if (hiddenParent) {
              activeElement.blur();
            }
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Убираем фокус с элементов при открытии модального окна на веб-платформе
  useEffect(() => {
    if (Platform.OS === 'web' && showDeleteConfirm) {
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined' && window.document) {
          const activeElement = window.document.activeElement as HTMLElement;
          if (activeElement && activeElement.blur) {
            const hiddenParent = activeElement.closest('[aria-hidden="true"]');
            if (hiddenParent) {
              activeElement.blur();
            }
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showDeleteConfirm]);

  const [formData, setFormData] = useState({
    name: user.name,
    username: user.username,
    bio: user.bio,
    phone: user.phone,
    location: user.location,
    birthDate: user.birthDate || '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selDay, setSelDay] = useState(
    user.birthDate ? user.birthDate.split('-')[2] : '01'
  );
  const [selMonth, setSelMonth] = useState(
    user.birthDate ? user.birthDate.split('-')[1] : '01'
  );
  const [selYear, setSelYear] = useState(
    user.birthDate ? user.birthDate.split('-')[0] : '2000'
  );
  const dateModalAnim = useRef(new Animated.Value(0)).current;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      try {
        setIsUploading(true);
        await uploadAvatar(result.assets[0].uri);
        showToast({ message: 'Логотип обновлен', type: 'success' });
      } catch (error: any) {
        showToast({ message: 'Ошибка загрузки', type: 'error' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
    Animated.timing(dateModalAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const closeDatePicker = () => {
    Animated.timing(dateModalAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowDatePicker(false));
  };

  const handleConfirmDate = () => {
    setFormData({ ...formData, birthDate: `${selYear}-${selMonth}-${selDay}` });
    closeDatePicker();
  };

  const getDisplayDate = () => {
    if (!formData.birthDate || formData.birthDate === 'Invalid Date') return 'Не указана';
    const parts = formData.birthDate.split('-');
    if (parts.length !== 3) return 'Не указана';
    const [y, m, d] = parts;
    const monthLabel = MONTHS.find(mon => mon.value === m)?.label;
    return `${parseInt(d)} ${monthLabel} ${y}`;
  };

  const handlePhoneChange = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length === 0) {
      setFormData({ ...formData, phone: '' });
      return;
    }
    if (cleaned.startsWith('8') || cleaned.startsWith('7')) {
      cleaned = cleaned.substring(1);
    }
    cleaned = cleaned.substring(0, 10);

    let formatted = '+7';
    if (cleaned.length > 0) {
      formatted += ' (' + cleaned.substring(0, 3);
    }
    if (cleaned.length >= 4) {
      formatted += ') ' + cleaned.substring(3, 6);
    }
    if (cleaned.length >= 7) {
      formatted += '-' + cleaned.substring(6, 8);
    }
    if (cleaned.length >= 9) {
      formatted += '-' + cleaned.substring(8, 10);
    }
    setFormData({ ...formData, phone: formatted });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      showToast({
        message: 'Название студии должно содержать минимум 2 символа',
        type: 'error',
      });
      return;
    }

    const usernameTrimmed = formData.username.trim().toLowerCase();
    if (!usernameTrimmed || usernameTrimmed.length < 3) {
      showToast({
        message: 'Имя пользователя должно быть не менее 3 символов',
        type: 'error',
      });
      return;
    }
    if (/\s/.test(usernameTrimmed)) {
      showToast({
        message: 'Имя пользователя не может содержать пробелы',
        type: 'error',
      });
      return;
    }

    if (formData.birthDate) {
      const birthDateValidation = validateBirthDate(formData.birthDate);
      if (!birthDateValidation.valid) {
        showToast({
          message: birthDateValidation.message || 'Некорректная дата',
          type: 'error',
        });
        return;
      }
    }

    if (formData.phone && formData.phone.trim().length > 0) {
      if (!validatePhone(formData.phone)) {
        showToast({ message: 'Некорректный формат телефона', type: 'error' });
        return;
      }
    }

    try {
      const sanitizedData = {
        ...formData,
        name: sanitizeText(formData.name.trim()),
        username: usernameTrimmed,
        bio: sanitizeText(formData.bio || ''),
        phone: formData.phone ? formatPhone(formData.phone) : formData.phone,
        location: sanitizeText(formData.location || ''),
      };

      await updateProfile(sanitizedData);
      showToast({ message: 'Профиль студии обновлен', type: 'success' });
      navigation.goBack();
    } catch (error: any) {
      showToast({
        message: error.message || 'Ошибка при обновлении профиля',
        type: 'error',
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await clearAllData();
      logout();
      showToast({ message: 'Аккаунт удален', type: 'success' });
    } catch (error: any) {
      showToast({
        message: error.message || 'Ошибка при удалении аккаунта',
        type: 'error',
      });
    }
    setShowDeleteConfirm(false);
  };

  const renderDatePicker = () => {
    const backdropOpacity = dateModalAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    const cardTranslateY = dateModalAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [SCREEN_HEIGHT, 0],
    });

    return (
      <Modal
        visible={showDatePicker}
        transparent
        animationType="none"
        onRequestClose={closeDatePicker}
        accessibilityViewIsModal={true}
        presentationStyle="overFullScreen"
      >
        <View 
          style={styles.modalRoot}
          accessible={false}
          importantForAccessibility="yes"
          accessibilityElementsHidden={false}
        >
          <Animated.View 
            style={[styles.modalBackdrop, { opacity: backdropOpacity }]}
            accessible={false}
          >
            <TouchableOpacity
              style={styles.flex}
              activeOpacity={1}
              onPress={closeDatePicker}
            />
          </Animated.View>
          <Animated.View
            style={[styles.modalCard, { transform: [{ translateY: cardTranslateY }] }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Дата основания / Рождения</Text>
              <TouchableOpacity onPress={closeDatePicker}>
                <Ionicons name="close" size={28} color={themeColors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContent}>
              <View style={styles.pickerCol}>
                <Text style={styles.colLabel}>День</Text>
                <FlatList
                  data={DAYS}
                  showsVerticalScrollIndicator={false}
                  keyExtractor={i => i.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => setSelDay(item.value)}
                      style={[
                        styles.pickerOpt,
                        item.value === selDay && styles.pickerOptActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickerOptText,
                          item.value === selDay && styles.pickerOptTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
              <View style={[styles.pickerCol, { flex: 1.5 }]}>
                <Text style={styles.colLabel}>Месяц</Text>
                <FlatList
                  data={MONTHS}
                  showsVerticalScrollIndicator={false}
                  keyExtractor={i => i.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => setSelMonth(item.value)}
                      style={[
                        styles.pickerOpt,
                        item.value === selMonth && styles.pickerOptActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickerOptText,
                          item.value === selMonth && styles.pickerOptTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
              <View style={styles.pickerCol}>
                <Text style={styles.colLabel}>Год</Text>
                <FlatList
                  data={YEARS}
                  showsVerticalScrollIndicator={false}
                  keyExtractor={i => i.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => setSelYear(item.value)}
                      style={[
                        styles.pickerOpt,
                        item.value === selYear && styles.pickerOptActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickerOptText,
                          item.value === selYear && styles.pickerOptTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmDate}>
              <Text style={styles.confirmButtonText}>Подтвердить</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.fullContainer} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={themeColors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Профиль студии</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Готово</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{user.avatarInitials}</Text>
              )}
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={pickImage}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons
                    name="camera"
                    size={18}
                    color={themeColors.primaryForeground}
                  />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.changePhotoLabel}>Изменить логотип</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Название студии</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={text => setFormData({ ...formData, name: text })}
                placeholder="Название организации"
                placeholderTextColor={themeColors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ID Студии (Username)</Text>
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={text => setFormData({ ...formData, username: text })}
                placeholder="@studio_name"
                autoCapitalize="none"
                placeholderTextColor={themeColors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>О деятельности</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bio}
                onChangeText={text => setFormData({ ...formData, bio: text })}
                placeholder="Расскажите о своих ивентах"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={themeColors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Дата основания / Рождения владельца</Text>
              <TouchableOpacity style={styles.dateSelector} onPress={openDatePicker}>
                <Text style={styles.dateSelectorText}>{getDisplayDate()}</Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={themeColors.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Контактный телефон</Text>
              <TextInput
                style={[
                  styles.input,
                  formData.phone &&
                    formData.phone.length > 0 &&
                    !validatePhone(formData.phone) &&
                    styles.inputError,
                ]}
                value={formData.phone}
                onChangeText={handlePhoneChange}
                placeholder="+7 (___) ___-__-__"
                keyboardType="phone-pad"
                maxLength={18}
                placeholderTextColor={themeColors.mutedForeground}
              />
              {formData.phone &&
                formData.phone.length > 0 &&
                !validatePhone(formData.phone) && (
                  <Text style={styles.errorText}>Некорректный формат телефона</Text>
                )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Город базирования</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={text => setFormData({ ...formData, location: text })}
                placeholder="Ваш город"
                placeholderTextColor={themeColors.mutedForeground}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Text style={styles.deleteAccountText}>Удалить аккаунт организации</Text>
          </TouchableOpacity>
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {renderDatePicker()}

      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
        accessibilityViewIsModal={true}
        presentationStyle="overFullScreen"
      >
        <View 
          style={styles.modalOverlay}
          accessible={false}
          importantForAccessibility="yes"
          accessibilityElementsHidden={false}
        >
          <View 
            style={styles.deleteModalContent}
            accessibilityViewIsModal={true}
            importantForAccessibility="yes"
            accessible={true}
          >
            <Text style={styles.deleteModalTitle}>Удалить профиль студии?</Text>
            <Text style={styles.deleteModalText}>
              Все созданные события и данные организации будут удалены безвозвратно.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonCancel]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.deleteModalButtonCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonConfirm]}
                onPress={handleDeleteAccount}
              >
                <Text style={styles.deleteModalButtonConfirmText}>Удалить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: tc.background },
  flex: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  headerButton: { padding: spacing.sm, minWidth: 60 },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: tc.foreground,
  },
  saveButtonText: {
    fontSize: typography.base,
    fontWeight: '600',
    color: tc.primary,
    textAlign: 'right',
  },
  container: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: tc.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: borderRadius.full },
  avatarText: {
    fontSize: typography['3xl'],
    fontWeight: '600',
    color: tc.foreground,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: tc.primary,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: tc.background,
  },
  changePhotoLabel: {
    marginTop: spacing.sm,
    fontSize: typography.sm,
    color: tc.primary,
    fontWeight: '500',
  },
  form: { gap: spacing.lg },
  inputGroup: { gap: spacing.xs },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: tc.foreground,
    marginLeft: 4,
  },
  input: {
    backgroundColor: tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: typography.base,
    color: tc.foreground,
  },
  textArea: { minHeight: 100, paddingTop: spacing.md },
  dateSelector: {
    backgroundColor: tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateSelectorText: { fontSize: typography.base, color: tc.foreground },
  deleteAccountButton: {
    marginTop: spacing['2xl'],
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteAccountText: { color: tc.destructive, fontSize: typography.sm, fontWeight: '500' },
  bottomSpacer: { height: 40 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: {
    backgroundColor: tc.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: spacing["2xl"],
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  modalTitle: { fontSize: typography["2xl"], fontWeight: '800', color: tc.foreground },
  datePickerContent: { flexDirection: 'row', height: 200 },
  pickerCol: { flex: 1 },
  colLabel: {
    textAlign: 'center',
    fontSize: typography.xs,
    color: tc.mutedForeground,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  pickerOpt: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginHorizontal: 4,
  },
  pickerOptActive: { backgroundColor: tc.primary },
  pickerOptText: { fontSize: 15, color: tc.foreground },
  pickerOptTextActive: { color: colors.white, fontWeight: '700' },
  confirmButton: {
    backgroundColor: tc.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  confirmButtonText: { color: colors.white, fontSize: typography.base, fontWeight: '800' },
  inputError: { borderColor: tc.destructive, borderWidth: 2 },
  errorText: { color: tc.destructive, fontSize: typography.sm, marginTop: 4, marginLeft: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  deleteModalContent: {
    backgroundColor: tc.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: typography.xl,
    fontWeight: '800',
    color: tc.foreground,
    marginBottom: spacing.md,
  },
  deleteModalText: {
    fontSize: typography.base,
    color: tc.mutedForeground,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  deleteModalButtons: { flexDirection: 'row', gap: spacing.md },
  deleteModalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  deleteModalButtonCancel: {
    backgroundColor: tc.secondary,
    borderWidth: 1,
    borderColor: tc.border,
  },
  deleteModalButtonCancelText: { color: tc.foreground, fontWeight: '700' },
  deleteModalButtonConfirm: { backgroundColor: tc.destructive },
  deleteModalButtonConfirmText: { color: colors.white, fontWeight: '700' },
});
