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
import { useUserStore } from '../store/userStore';
import { useToast } from '../components/ToastProvider';
import { ALL_INTERESTS } from '../data/userMockData';
import { validatePhone, formatPhone, sanitizeText } from '../utils/security';
import { validateBirthDate } from '../utils/dateUtils';
import Header from '../components/Header';

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

export default function EditProfileScreen() {
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
    interests: [...user.interests],
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
        showToast({ message: 'Фото обновлено', type: 'success' });
      } catch (error: any) {
        showToast({ message: 'Не удалось загрузить фото', type: 'error' });
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
      showToast({ message: 'Имя должно содержать минимум 2 символа', type: 'error' });
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
          message: birthDateValidation.message || 'Некорректная дата рождения',
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
      showToast({ message: 'Профиль успешно обновлен', type: 'success' });
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

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
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
              <Text style={styles.modalTitle}>Дата рождения</Text>
              <TouchableOpacity onPress={closeDatePicker}>
                <Ionicons name="close" size={28} color={colors.light.foreground} />
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

  const isPhoneInvalid = !!(
    formData.phone &&
    formData.phone.length > 0 &&
    !validatePhone(formData.phone)
  );

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />

      <Header
        title="Редактировать"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.saveBar}>
        <TouchableOpacity onPress={handleSave} style={styles.saveActionBtn}>
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
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="camera"
                    size={18}
                    color={colors.light.primaryForeground}
                  />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.changePhotoLabel}>Изменить фото</Text>
          </View>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Имя</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={text => setFormData({ ...formData, name: text })}
                placeholder="Ваше имя"
                placeholderTextColor={colors.light.mutedForeground}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Имя пользователя</Text>
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={text => setFormData({ ...formData, username: text })}
                placeholder="@username"
                autoCapitalize="none"
                placeholderTextColor={colors.light.mutedForeground}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>О себе</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bio}
                onChangeText={text => setFormData({ ...formData, bio: text })}
                placeholder="Расскажите о себе"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={colors.light.mutedForeground}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Дата рождения</Text>
              <TouchableOpacity style={styles.dateSelector} onPress={openDatePicker}>
                <Text style={styles.dateSelectorText}>{getDisplayDate()}</Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.light.primary}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Телефон</Text>
              <TextInput
                style={[styles.input, isPhoneInvalid && styles.inputError]}
                value={formData.phone}
                onChangeText={handlePhoneChange}
                placeholder="+7 (___) ___-__-__"
                keyboardType="phone-pad"
                maxLength={18}
                placeholderTextColor={colors.light.mutedForeground}
              />
              {isPhoneInvalid ? (
                <Text style={styles.errorText}>Некорректный формат телефона</Text>
              ) : null}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Город</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={text => setFormData({ ...formData, location: text })}
                placeholder="Ваш город"
                placeholderTextColor={colors.light.mutedForeground}
              />
            </View>
            <View style={styles.interestsSection}>
              <Text style={styles.label}>Интересы</Text>
              <View style={styles.interestsGrid}>
                {ALL_INTERESTS.map(interest => {
                  const isSelected = formData.interests.includes(interest);
                  return (
                    <TouchableOpacity
                      key={interest}
                      style={[styles.interestTag, isSelected && styles.interestTagActive]}
                      onPress={() => toggleInterest(interest)}
                    >
                      <Text
                        style={[
                          styles.interestTagText,
                          isSelected && styles.interestTagTextActive,
                        ]}
                      >
                        {interest}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Text style={styles.deleteAccountText}>Удалить аккаунт</Text>
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
            <Text style={styles.deleteModalTitle}>Удалить аккаунт?</Text>
            <Text style={styles.deleteModalText}>
              Это действие нельзя отменить. Все ваши данные будут удалены безвозвратно.
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
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: colors.light.background },
  flex: { flex: 1 },
  saveBar: {
    backgroundColor: colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    height: 44,
  },
  saveActionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  saveButtonText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.light.primary,
  },
  container: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.light.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: borderRadius.full },
  avatarText: {
    fontSize: typography['3xl'],
    fontWeight: '600',
    color: colors.light.foreground,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.light.primary,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.light.background,
  },
  changePhotoLabel: {
    marginTop: spacing.sm,
    fontSize: typography.sm,
    color: colors.light.primary,
    fontWeight: '500',
  },
  form: { gap: spacing.lg },
  inputGroup: { gap: spacing.xs },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.light.foreground,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: typography.base,
    color: colors.light.foreground,
  },
  textArea: { minHeight: 100, paddingTop: spacing.md },
  dateSelector: {
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateSelectorText: { fontSize: typography.base, color: colors.light.foreground },
  interestsSection: { marginTop: spacing.md },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  interestTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  interestTagActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  interestTagText: { fontSize: typography.sm, color: colors.light.foreground },
  interestTagTextActive: { color: colors.light.primaryForeground, fontWeight: '600' },
  deleteAccountButton: {
    marginTop: spacing['2xl'],
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteAccountText: { color: '#EF4444', fontSize: typography.sm, fontWeight: '500' },
  bottomSpacer: { height: 40 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: {
    backgroundColor: colors.light.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.light.foreground },
  datePickerContent: { flexDirection: 'row', height: 200 },
  pickerCol: { flex: 1 },
  colLabel: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.light.mutedForeground,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  pickerOpt: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  pickerOptActive: { backgroundColor: colors.light.primary },
  pickerOptText: { fontSize: 15, color: colors.light.foreground },
  pickerOptTextActive: { color: '#fff', fontWeight: '700' },
  confirmButton: {
    backgroundColor: colors.light.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  confirmButtonText: { color: '#fff', fontSize: typography.base, fontWeight: '800' },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  deleteModalContent: {
    backgroundColor: colors.light.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: typography.xl,
    fontWeight: '800',
    color: colors.light.foreground,
    marginBottom: spacing.md,
  },
  deleteModalText: {
    fontSize: typography.base,
    color: colors.light.mutedForeground,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deleteModalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  deleteModalButtonCancel: {
    backgroundColor: colors.light.secondary,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  deleteModalButtonCancelText: {
    color: colors.light.foreground,
    fontWeight: '700',
  },
  deleteModalButtonConfirm: {
    backgroundColor: '#EF4444',
  },
  deleteModalButtonConfirmText: {
    color: '#fff',
    fontWeight: '700',
  },
});
