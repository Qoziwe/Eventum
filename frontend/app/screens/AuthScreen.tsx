import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useUserStore } from '../store/userStore';
import { ALL_INTERESTS, UserRole, AVAILABLE_CITIES } from '../data/userMockData';
import { useToast } from '../components/ToastProvider';
import { validateEmail, validatePassword } from '../utils/security';
import { validateBirthDate } from '../utils/dateUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  { id: 'm7', label: 'Июля', value: '07' },
  { id: 'm8', label: 'Августа', value: '08' },
  { id: 'm9', label: 'Сентября', value: '09' },
  { id: 'm10', label: 'Ноября', value: '10' },
  { id: 'm11', label: 'Декабря', value: '12' },
];

const YEARS = Array.from({ length: 80 }, (_, i) => {
  const year = 2024 - i;
  return { id: `y${year}`, label: `${year}`, value: `${year}` };
});

const FadeInView = ({ children, delay = 0, style = {} }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 600,
      delay,
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

type StepType = 'welcome' | 'form' | 'interests' | 'success';

interface Step {
  id: string;
  type: StepType;
}

export default function AuthScreen() {
  const { register, login, updateInterests, completeRegistration, user } = useUserStore();
  const { showToast } = useToast();
  const flatListRef = useRef<FlatList<any>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useState('');
  const [showCityPicker, setShowCityPicker] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selDay, setSelDay] = useState('');
  const [selMonth, setSelMonth] = useState('');
  const [selYear, setSelYear] = useState('');
  const [birthDate, setBirthDate] = useState(''); // ГГГГ-ММ-ДД

  const [role, setRole] = useState<UserRole>('explorer');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Состояния для управления доступностью шагов
  const [registrationCompleted, setRegistrationCompleted] = useState(false);
  const [interestsCompleted, setInterestsCompleted] = useState(false);
  const [loginCompleted, setLoginCompleted] = useState(false);

  const floatingAnim = useRef(new Animated.Value(0)).current;
  const cityModalAnim = useRef(new Animated.Value(0)).current;
  const dateModalAnim = useRef(new Animated.Value(0)).current;

  // Конфигурация для супер-плавной пружины
  const springConfig = {
    damping: 20,
    stiffness: 150,
    mass: 0.8,
    useNativeDriver: true,
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatingAnim]);

  // Определяем доступные шаги в зависимости от состояния
  const steps = useMemo<Step[]>(() => {
    const stepsArray: Step[] = [];

    // Всегда показываем приветственный экран и форму
    stepsArray.push({ id: 'welcome', type: 'welcome' });
    stepsArray.push({ id: 'form', type: 'form' });

    // Для регистрации исследователя показываем интересы только после успешной регистрации
    if (
      authMode === 'signup' &&
      role === 'explorer' &&
      registrationCompleted &&
      !interestsCompleted
    ) {
      stepsArray.push({ id: 'interests', type: 'interests' });
    }

    // Показываем success только когда все условия выполнены
    if (
      (authMode === 'signup' &&
        registrationCompleted &&
        (role === 'organizer' || interestsCompleted)) ||
      (authMode === 'login' && loginCompleted)
    ) {
      stepsArray.push({ id: 'success', type: 'success' });
    }

    return stepsArray;
  }, [authMode, role, registrationCompleted, interestsCompleted, loginCompleted]);

  // Автоматически переходим на последний шаг при изменении steps
  useEffect(() => {
    if (steps.length > 0 && flatListRef.current) {
      // Если мы на шаге регистрации и она успешна, переходим к следующему шагу
      if (registrationCompleted && !interestsCompleted && role === 'explorer') {
        // Переходим к шагу интересов (индекс 2)
        setTimeout(() => {
          if (steps.length > 2 && steps[2]?.type === 'interests') {
            flatListRef.current?.scrollToIndex({ index: 2, animated: true });
          }
        }, 300);
      }
      // Если интересы заполнены, переходим к success
      else if (interestsCompleted && role === 'explorer') {
        setTimeout(() => {
          const lastIndex = steps.length - 1;
          if (steps[lastIndex]?.type === 'success') {
            flatListRef.current?.scrollToIndex({ index: lastIndex, animated: true });
          }
        }, 300);
      }
      // Для организатора сразу переходим к success
      else if (registrationCompleted && role === 'organizer' && interestsCompleted) {
        setTimeout(() => {
          const lastIndex = steps.length - 1;
          if (steps[lastIndex]?.type === 'success') {
            flatListRef.current?.scrollToIndex({ index: lastIndex, animated: true });
          }
        }, 300);
      }
      // Для логина переходим к success
      else if (loginCompleted) {
        setTimeout(() => {
          const lastIndex = steps.length - 1;
          if (steps[lastIndex]?.type === 'success') {
            flatListRef.current?.scrollToIndex({ index: lastIndex, animated: true });
          }
        }, 300);
      }
    }
  }, [steps.length, registrationCompleted, interestsCompleted, loginCompleted, role]);

  const goToStep = (index: number) => {
    if (index >= 0 && index < steps.length && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true });
      setCurrentStepIndex(index);
    }
  };

  const goToStepSafe = (index: number) => {
    if (flatListRef.current && steps.length > index) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
      setCurrentStepIndex(index);
    }
  };

  const openCityPicker = () => {
    setShowCityPicker(true);
    Animated.spring(cityModalAnim, {
      toValue: 1,
      ...springConfig,
    }).start();
  };

  const closeCityPicker = () => {
    Animated.spring(cityModalAnim, {
      toValue: 0,
      ...springConfig,
    }).start(() => setShowCityPicker(false));
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
    Animated.spring(dateModalAnim, {
      toValue: 1,
      ...springConfig,
    }).start();
  };

  const closeDatePicker = () => {
    Animated.spring(dateModalAnim, {
      toValue: 0,
      ...springConfig,
    }).start(() => setShowDatePicker(false));
  };

  const handleConfirmDate = () => {
    if (!selDay || !selMonth || !selYear) {
      showToast({ message: 'Пожалуйста, выберите полную дату', type: 'error' });
      return;
    }
    setBirthDate(`${selYear}-${selMonth}-${selDay}`);
    closeDatePicker();
  };

  const getDisplayDate = () => {
    if (!birthDate) return 'Дата рождения';
    const [y, m, d] = birthDate.split('-');
    const monthLabel = MONTHS.find(mon => mon.value === m)?.label;
    return `${parseInt(d)} ${monthLabel} ${y}`;
  };

  const handleAuthAction = async () => {
    if (!email || !password) {
      showToast({ message: 'Пожалуйста, заполните почту и пароль', type: 'error' });
      return;
    }

    // Валидация email
    if (!validateEmail(email)) {
      showToast({ message: 'Некорректный формат email', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        if (!name || name.trim().length < 2) {
          showToast({ message: 'Введите ваше имя (минимум 2 символа)', type: 'error' });
          setLoading(false);
          return;
        }

        // Валидация пароля
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          showToast({
            message: passwordValidation.message || 'Некорректный пароль',
            type: 'error',
          });
          setLoading(false);
          return;
        }

        if (!birthDate) {
          showToast({ message: 'Укажите дату рождения', type: 'error' });
          setLoading(false);
          return;
        }

        // Валидация даты рождения
        const birthDateValidation = validateBirthDate(birthDate);
        if (!birthDateValidation.valid) {
          showToast({
            message: birthDateValidation.message || 'Некорректная дата рождения',
            type: 'error',
          });
          setLoading(false);
          return;
        }

        if (!location) {
          showToast({ message: 'Выберите ваш город', type: 'error' });
          setLoading(false);
          return;
        }

        await register({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
          userType: role,
          location,
          birthDate,
          role: role === 'organizer' ? 'Организатор' : 'Исследователь',
        });

        setRegistrationCompleted(true);
        showToast({ message: 'Аккаунт успешно создан!', type: 'success' });

        // Для организатора интересы не нужны - сразу отмечаем как completed
        if (role === 'organizer') {
          setInterestsCompleted(true);
        }
      } else {
        const success = await login(email.toLowerCase().trim(), password);
        if (success) {
          showToast({ message: 'С возвращением!', type: 'success' });
          setLoginCompleted(true);
        } else {
          showToast({ message: 'Неверный email или пароль.', type: 'error' });
          setLoading(false);
          return;
        }
      }
    } catch (error: any) {
      showToast({ message: error.message || 'Ошибка', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFinishInterests = async () => {
    if (selectedInterests.length < 3) {
      showToast({ message: 'Выберите хотя бы 3 категории', type: 'info' });
      return;
    }

    try {
      await updateInterests(selectedInterests);
      setInterestsCompleted(true);
      showToast({ message: 'Интересы сохранены!', type: 'success' });

      // Ждем немного перед переходом
      setTimeout(() => {
        if (steps.length > 3) {
          flatListRef.current?.scrollToIndex({ index: 3, animated: true });
        }
      }, 500);
    } catch (error) {
      // Даже если ошибка, все равно переходим дальше
      setInterestsCompleted(true);
      showToast({ message: 'Интересы сохранены локально', type: 'info' });

      setTimeout(() => {
        if (steps.length > 3) {
          flatListRef.current?.scrollToIndex({ index: 3, animated: true });
        }
      }, 500);
    }
  };

  const handleStart = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    // Сбрасываем все состояния
    setRegistrationCompleted(false);
    setInterestsCompleted(false);
    setLoginCompleted(false);
    setSelectedInterests([]);
    setShowPassword(false);

    // Переходим к форме
    goToStepSafe(1);
  };

  const handleOpenApp = () => {
    completeRegistration();
    showToast({ message: 'Добро пожаловать в приложение!', type: 'success' });
  };

  const handleGoBack = () => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  };

  const renderCityPicker = () => {
    const backdropOpacity = cityModalAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    const cardTranslateY = cityModalAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [SCREEN_HEIGHT, 0],
    });

    return (
      <Modal
        visible={showCityPicker}
        transparent
        animationType="none"
        onRequestClose={closeCityPicker}
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
              onPress={closeCityPicker}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.modalPaymentCard,
              { transform: [{ translateY: cardTranslateY }] },
            ]}
          >
            <View style={styles.modalPaymentHeader}>
              <Text style={styles.modalPaymentTitle}>Выберите город</Text>
              <TouchableOpacity onPress={closeCityPicker}>
                <Ionicons name="close" size={28} color={colors.light.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.cityListScroll}
            >
              {AVAILABLE_CITIES.map(city => {
                const isAvailable = city === 'Алматы';
                return (
                  <TouchableOpacity
                    key={city}
                    disabled={!isAvailable}
                    style={[
                      styles.cityItem,
                      location === city && styles.cityItemActive,
                      !isAvailable && styles.cityItemDisabled,
                    ]}
                    onPress={() => {
                      setLocation(city);
                      closeCityPicker();
                    }}
                  >
                    <View style={styles.flex}>
                      <Text
                        style={[
                          styles.cityItemText,
                          location === city && styles.cityItemTextActive,
                          !isAvailable && styles.cityItemTextDisabled,
                        ]}
                      >
                        {city}
                      </Text>
                      {!isAvailable && (
                        <Text style={styles.comingSoonText}>Скоро открытие</Text>
                      )}
                    </View>
                    {location === city && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.light.primary}
                      />
                    )}
                    {!isAvailable && (
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={colors.light.mutedForeground}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
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
            style={[
              styles.modalPaymentCard,
              { transform: [{ translateY: cardTranslateY }] },
            ]}
          >
            <View style={styles.modalPaymentHeader}>
              <Text style={styles.modalPaymentTitle}>Дата рождения</Text>
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
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: spacing.lg }]}
              onPress={handleConfirmDate}
            >
              <Text style={styles.primaryButtonText}>Подтвердить</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const renderStep = ({ item }: { item: Step }) => {
    if (item.type === 'welcome') {
      return (
        <View style={styles.page}>
          <Animated.View
            style={[
              styles.iconCircle,
              {
                transform: [
                  {
                    translateY: floatingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -15],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="planet-outline" size={80} color={colors.light.primary} />
          </Animated.View>
          <FadeInView delay={300}>
            <Text style={styles.stepTitle}>
              {'Твой город. Твои люди. \nТвой следующий шаг'}
            </Text>
          </FadeInView>
          <FadeInView delay={500}>
            <Text style={styles.stepDescription}>
              Открой для себя уникальные события или создай свое сообщество. Листай
              вправо, чтобы начать.
            </Text>
          </FadeInView>
          <View style={styles.welcomeButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => handleStart('signup')}
            >
              <Text style={styles.primaryButtonText}>Начать путь</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => handleStart('login')}
            >
              <Text style={styles.secondaryButtonText}>У меня уже есть аккаунт</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    if (item.type === 'form') {
      return (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.stepTitle}>
            {authMode === 'signup' ? 'Создай аккаунт' : 'С возвращением!'}
          </Text>
          <View style={styles.form}>
            {authMode === 'signup' && (
              <TextInput
                style={styles.input}
                placeholder="Имя Фамилия"
                placeholderTextColor={colors.light.mutedForeground}
                value={name}
                onChangeText={setName}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.light.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, { paddingRight: 50 }]}
                placeholder="Пароль"
                placeholderTextColor={colors.light.mutedForeground}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={colors.light.mutedForeground}
                />
              </TouchableOpacity>
            </View>
            {authMode === 'signup' && (
              <>
                <TouchableOpacity style={styles.citySelector} onPress={openDatePicker}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.light.primary}
                  />
                  <Text
                    style={[
                      styles.citySelectorText,
                      !birthDate && { color: colors.light.mutedForeground },
                    ]}
                  >
                    {getDisplayDate()}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={colors.light.mutedForeground}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.citySelector} onPress={openCityPicker}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={colors.light.primary}
                  />
                  <Text
                    style={[
                      styles.citySelectorText,
                      !location && { color: colors.light.mutedForeground },
                    ]}
                  >
                    {location || 'Выберите ваш город'}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={colors.light.mutedForeground}
                  />
                </TouchableOpacity>
                <View>
                  <Text style={styles.label}>Выбери свою роль:</Text>
                  <View style={styles.roleContainer}>
                    <TouchableOpacity
                      style={[
                        styles.roleCard,
                        role === 'explorer' && styles.roleCardActive,
                      ]}
                      onPress={() => setRole('explorer')}
                    >
                      <Ionicons
                        name="compass-outline"
                        size={28}
                        color={
                          role === 'explorer'
                            ? colors.light.primary
                            : colors.light.mutedForeground
                        }
                      />
                      <Text
                        style={[
                          styles.roleLabel,
                          role === 'explorer' && styles.roleLabelActive,
                        ]}
                      >
                        Исследователь
                      </Text>
                      <Text style={styles.roleSub}>Ищу крутые ивенты</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.roleCard,
                        role === 'organizer' && styles.roleCardActive,
                      ]}
                      onPress={() => setRole('organizer')}
                    >
                      <Ionicons
                        name="create-outline"
                        size={28}
                        color={
                          role === 'organizer'
                            ? colors.light.primary
                            : colors.light.mutedForeground
                        }
                      />
                      <Text
                        style={[
                          styles.roleLabel,
                          role === 'organizer' && styles.roleLabelActive,
                        ]}
                      >
                        Организатор
                      </Text>
                      <Text style={styles.roleSub}>Создаю движ (Тариф)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleAuthAction}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.primaryButtonText}>
                  {authMode === 'signup' ? 'Зарегистрироваться' : 'Войти'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeSwitch}
            onPress={() => {
              setAuthMode(authMode === 'signup' ? 'login' : 'signup');
              setRegistrationCompleted(false);
              setInterestsCompleted(false);
              setLoginCompleted(false);
              setSelectedInterests([]);
              setShowPassword(false);
            }}
          >
            <Text style={styles.modeSwitchText}>
              {authMode === 'signup'
                ? 'Уже есть аккаунт? Войти'
                : 'Нет аккаунта? Зарегистрироваться'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
    if (item.type === 'interests') {
      return (
        <View style={styles.page}>
          <Text style={styles.stepTitle}>Твои интересы</Text>
          <Text style={styles.stepDescription}>Выберите минимум 3 категории</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.interestsScroll}
            contentContainerStyle={styles.interestsGrid}
          >
            {ALL_INTERESTS.map(interest => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestChip,
                  selectedInterests.includes(interest) && styles.interestChipActive,
                ]}
                onPress={() =>
                  setSelectedInterests(prev =>
                    prev.includes(interest)
                      ? prev.filter(it => it !== interest)
                      : [...prev, interest]
                  )
                }
              >
                <Text
                  style={[
                    styles.interestText,
                    selectedInterests.includes(interest) && styles.interestTextActive,
                  ]}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              selectedInterests.length < 3 && styles.disabledButton,
            ]}
            onPress={handleFinishInterests}
            disabled={selectedInterests.length < 3}
          >
            <Text style={styles.primaryButtonText}>
              {'Подтвердить (' + selectedInterests.length + '/3)'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoBack}>
            <Text style={styles.secondaryButtonText}>Назад</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (item.type === 'success') {
      return (
        <View style={styles.page}>
          <View style={styles.successIconWrapper}>
            <Ionicons name="sparkles" size={100} color={colors.light.primary} />
          </View>
          <Text style={styles.stepTitle}>
            {authMode === 'login' ? 'Рады видеть вас снова!' : 'Все готово!'}
          </Text>
          <Text style={styles.stepDescription}>
            {authMode === 'login'
              ? 'Авторизация прошла успешно.'
              : role === 'explorer'
                ? 'Регистрация завершена! Теперь вы можете наслаждаться приложением.'
                : 'Регистрация завершена! Теперь вы можете создавать события.'}
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleOpenApp}>
            <Text style={styles.primaryButtonText}>Открыть приложение</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <View style={styles.pagination}>
            {steps.map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: scrollX.interpolate({
                      inputRange: [
                        (i - 1) * SCREEN_WIDTH,
                        i * SCREEN_WIDTH,
                        (i + 1) * SCREEN_WIDTH,
                      ],
                      outputRange: [10, 30, 10],
                      extrapolate: 'clamp',
                    }),
                    opacity: scrollX.interpolate({
                      inputRange: [
                        (i - 1) * SCREEN_WIDTH,
                        i * SCREEN_WIDTH,
                        (i + 1) * SCREEN_WIDTH,
                      ],
                      outputRange: [0.3, 1, 0.3],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <FlatList
          ref={flatListRef}
          data={steps}
          renderItem={renderStep}
          keyExtractor={item => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false} // Отключаем свайп, управляем только программно
          scrollEventThrottle={16}
          onMomentumScrollEnd={e =>
            setCurrentStepIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
          }
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: false,
          })}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          extraData={steps.length}
        />
      </KeyboardAvoidingView>
      {renderCityPicker()}
      {renderDatePicker()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  flex: { flex: 1 },
  header: { height: 60, justifyContent: 'center', alignItems: 'center' },
  pagination: { flexDirection: 'row', gap: 8 },
  dot: { height: 6, borderRadius: 3, backgroundColor: colors.light.primary },
  page: {
    width: SCREEN_WIDTH,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  scrollContent: {
    width: SCREEN_WIDTH,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${colors.light.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.light.foreground,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: spacing.md,
  },
  stepDescription: {
    fontSize: typography.base,
    color: colors.light.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing['2xl'],
  },
  welcomeButtons: { width: '100%', gap: spacing.md, marginTop: spacing.xl },
  primaryButton: {
    backgroundColor: colors.light.primary,
    width: '100%',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    elevation: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: typography.base, fontWeight: '800' },
  secondaryButton: {
    width: '100%',
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.light.primary,
    fontSize: typography.sm,
    fontWeight: '700',
  },
  form: { width: '100%', gap: spacing.md, marginBottom: spacing.xl },
  input: {
    backgroundColor: colors.light.card,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    fontSize: typography.base,
    color: colors.light.foreground,
  },
  passwordContainer: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.lg,
    height: '100%',
    justifyContent: 'center',
  },
  citySelector: {
    backgroundColor: colors.light.card,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  citySelectorText: {
    flex: 1,
    fontSize: typography.base,
    color: colors.light.foreground,
    fontWeight: '500',
  },
  label: {
    fontSize: typography.sm,
    fontWeight: '800',
    color: colors.light.foreground,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  roleContainer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  roleCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.light.border,
    backgroundColor: colors.light.card,
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: colors.light.primary,
    backgroundColor: `${colors.light.primary}08`,
  },
  roleLabel: {
    fontSize: typography.sm,
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  roleLabelActive: { color: colors.light.primary },
  roleSub: {
    fontSize: 10,
    color: colors.light.mutedForeground,
    marginTop: 4,
    textAlign: 'center',
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeSwitch: { marginTop: spacing.lg, padding: spacing.md },
  modeSwitchText: {
    color: colors.light.mutedForeground,
    fontSize: typography.sm,
    fontWeight: '600',
  },
  interestsScroll: { width: '100%', maxHeight: '50%', marginBottom: spacing.lg },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  interestChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    backgroundColor: colors.light.background,
  },
  interestChipActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  interestText: {
    color: colors.light.foreground,
    fontSize: typography.sm,
    fontWeight: '600',
  },
  interestTextActive: { color: '#fff' },
  disabledButton: { opacity: 0.5 },
  successIconWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${colors.light.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalPaymentCard: {
    backgroundColor: colors.light.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalPaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  modalPaymentTitle: { fontSize: 22, fontWeight: '800', color: colors.light.foreground },
  cityListScroll: { marginBottom: 20 },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  cityItemActive: { backgroundColor: `${colors.light.primary}05` },
  cityItemDisabled: { opacity: 0.6 },
  cityItemText: { fontSize: 16, color: colors.light.foreground, fontWeight: '500' },
  cityItemTextActive: { color: colors.light.primary, fontWeight: '700' },
  cityItemTextDisabled: { color: colors.light.mutedForeground },
  comingSoonText: {
    fontSize: 12,
    color: colors.light.mutedForeground,
    fontWeight: '500',
    marginTop: 2,
  },
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
});
