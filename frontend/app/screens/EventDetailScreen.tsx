import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useUserStore } from '../store/userStore';
import { useToast } from '../components/ToastProvider';
import { apiClient } from '../api/apiClient';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
import EventPlaceholder from '../assets/placeholder.jpg';
import AvatarPlaceholder from '../assets/lackofavatar.png';

export default function EventDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { toggleFavorite, isFavorite, buyTicket, isPurchased, user, isAuthenticated } =
    useUserStore();
  const { showToast } = useToast();

  const [imageError, setImageError] = useState(false);
  const [organizerAvatarError, setOrganizerAvatarError] = useState(false); // ADDED: State for avatar error
  const [quantity, setQuantity] = useState(1);
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [views, setViews] = useState(0);

  const modalAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const params = route.params || {};

  const formatEventDate = (ts: any) => {
    if (!ts) return params.date || 'Скоро';
    const d = new Date(ts);
    return d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sendView = async () => {
    try {
      const response = await apiClient(`events/${params.id}/view`, {
        method: 'POST',
      });

      if (response && response.views !== undefined) {
        setViews(response.views);
      }
    } catch (error) {
      // ignore send view errors
    }
  };

  useEffect(() => {
    if (params.id && params.id !== 'unknown') {
      sendView();
    }
  }, [params.id]);

  const event = {
    id: params.id || 'unknown',
    title: params.title || 'Название события',
    date: formatEventDate(params.timestamp),
    location: params.location || 'Место проведения',
    priceValue: params.priceValue !== undefined ? params.priceValue : 0,
    category: params.categories ? params.categories[0] : params.category || 'Событие',
    fullDescription:
      params.fullDescription || params.description || 'Описание события скоро появится.',
    organizerName: params.organizerName || 'Организатор',
    organizerAvatar: params.organizerAvatar || AvatarPlaceholder,
    organizerId: params.organizerId || '',
    timeRange: params.timeRange || 'Время не указано',
    ageLimit: params.ageLimit || 0,
    vibe: params.vibe || 'chill',
    tags: params.tags || [],
    image: params.image || '',
    timestamp: params.timestamp,
    views: views || params.views || 0,
    moderationStatus: params.moderationStatus || 'approved',
  };

  const isOrganizer = user.userType === 'organizer';
  const isMine = user.id === event.organizerId;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (showPayment) {
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [showPayment]);

  const closePaymentModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowPayment(false);
    });
  };

  const isFav = isFavorite(event.id);
  const alreadyBought = isPurchased(event.id);

  const handleToggleFavorite = () => {
    if (isOrganizer) {
      showToast({ message: 'Организаторы не могут добавлять в избранное', type: 'info' });
      return;
    }
    toggleFavorite(event.id);
  };

  const handleProcessPayment = () => {
    if (!isAuthenticated || !user.id) {
      showToast({ message: 'Войдите в аккаунт для покупки билетов', type: 'error' });
      setShowPayment(false);
      return;
    }

    if (!quantity || quantity <= 0 || quantity > 10) {
      showToast({ message: 'Количество билетов должно быть от 1 до 10', type: 'error' });
      return;
    }

    if (
      event.priceValue > 0 &&
      (cardNumber.length < 16 || expiry.length < 4 || cvv.length < 3)
    ) {
      showToast({
        message: 'Пожалуйста, заполните все данные карты корректно.',
        type: 'error',
      });
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      try {
        buyTicket(event.id, quantity);
        setIsProcessing(false);
        setCardNumber('');
        setExpiry('');
        setCvv('');
        Animated.timing(modalAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowPayment(false);
          showToast({
            message: 'Билет приобретен и доступен в вашем профиле.',
            type: 'success',
          });
          setTimeout(() => {
            navigation.navigate('MainTabs', { screen: 'Profile' });
          }, 1500);
        });
      } catch (error: any) {
        setIsProcessing(false);
        showToast({
          message: error.message || 'Ошибка при покупке билета',
          type: 'error',
        });
      }
    }, 2000);
  };

  const imageSource =
    imageError || !event.image
      ? EventPlaceholder
      : typeof event.image === 'string'
        ? { uri: event.image }
        : event.image;

  // Logic for Organizer Avatar with Error Handling
  const organizerAvatarSource =
    organizerAvatarError || !event.organizerAvatar
      ? AvatarPlaceholder
      : typeof event.organizerAvatar === 'string'
        ? { uri: event.organizerAvatar }
        : event.organizerAvatar;

  const backdropOpacity = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const cardTranslateY = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT * 0.8, 0],
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.stickyHeaderContent}>
            <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
              {event.title}
            </Text>
          </View>
        </SafeAreaView>
      </Animated.View>

      <SafeAreaView style={styles.headerActions} edges={['top']}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.light.foreground} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleBtn} onPress={handleToggleFavorite}>
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={24}
            color={isFav ? '#E91E63' : colors.light.foreground}
          />
        </TouchableOpacity>
      </SafeAreaView>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={imageSource}
            style={styles.eventImage}
            onError={() => setImageError(true)}
          />
          <View style={styles.imageOverlay} />
        </View>

        <View style={styles.mainContent}>
          <View style={styles.badgeRow}>
            <View
              style={[styles.badge, { backgroundColor: colors.light.primary + '15' }]}
            >
              <Text style={[styles.badgeText, { color: colors.light.primary }]}>
                {event.category}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.light.secondary }]}>
              <Text style={[styles.badgeText, { color: colors.light.foreground }]}>
                {event.vibe}
              </Text>
            </View>
            {event.ageLimit > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.light.secondary }]}>
                <Text style={styles.badgeText}>{event.ageLimit}+</Text>
              </View>
            )}
            <View style={[styles.badge, styles.viewsBadge]}>
              <Ionicons
                name="eye-outline"
                size={14}
                color={colors.light.mutedForeground}
              />
              <Text style={styles.viewsBadgeText}>{event.views}</Text>
            </View>
          </View>

          <Text style={styles.eventTitle}>{event.title}</Text>

          <TouchableOpacity
            style={styles.organizerCard}
            onPress={() =>
              navigation.navigate('OrganizerProfile', { organizerId: event.organizerId })
            }
          >
            <Image
              source={organizerAvatarSource}
              style={styles.organizerAvatar}
              onError={() => setOrganizerAvatarError(true)} // Handle avatar load error
            />
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerLabel}>Организатор</Text>
              <Text style={styles.organizerName}>{event.organizerName}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.light.mutedForeground}
            />
          </TouchableOpacity>

          <View style={styles.infoGrid}>
            <InfoBox icon="calendar" title="Дата" value={event.date} />
            <InfoBox icon="time" title="Время" value={event.timeRange} />
          </View>

          <TouchableOpacity style={styles.locationCard}>
            <View style={styles.locationIconBg}>
              <Ionicons name="location" size={24} color={colors.light.primary} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.infoLabel}>Место проведения</Text>
              <Text style={styles.infoValue}>{event.location}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Описание</Text>
            <Text style={styles.descriptionText}>{event.fullDescription}</Text>
          </View>
        </View>
      </Animated.ScrollView>

      <View style={styles.bottomBar}>
        {isMine ? (
          event.moderationStatus === 'pending' ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF3C7', paddingVertical: 14, borderRadius: borderRadius.xl, gap: 8 }}>
              <Ionicons name="time-outline" size={20} color="#92400E" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#92400E' }}>На модерации</Text>
            </View>
          ) : event.moderationStatus === 'rejected' ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', paddingVertical: 14, borderRadius: borderRadius.xl, gap: 8 }}>
              <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#DC2626' }}>Отклонено модератором</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.buyButton,
                { flex: 1, backgroundColor: colors.light.foreground },
              ]}
              onPress={() => navigation.navigate('CreateEvent', { event })}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={colors.light.primaryForeground}
              />
              <Text style={styles.buyButtonText}>Редактировать</Text>
            </TouchableOpacity>
          )
        ) : alreadyBought ? (
          <TouchableOpacity
            style={[styles.buyButton, { flex: 1 }]}
            onPress={() => navigation.navigate('TicketDetail', { event })}
          >
            <Ionicons
              name="qr-code-outline"
              size={20}
              color={colors.light.primaryForeground}
            />
            <Text style={styles.buyButtonText}>Показать билет</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Итоговая цена</Text>
              <Text style={styles.totalPrice}>
                {event.priceValue === 0
                  ? 'Бесплатно'
                  : `${(event.priceValue * quantity).toLocaleString()} ₸`}
              </Text>
            </View>
            <View style={styles.buyActions}>
              {event.priceValue > 0 && (
                <View style={styles.quantityPicker}>
                  <TouchableOpacity
                    onPress={() => quantity > 1 && setQuantity(q => q - 1)}
                    style={styles.qBtn}
                  >
                    <Ionicons name="remove" size={18} color={colors.light.foreground} />
                  </TouchableOpacity>
                  <Text style={styles.qText}>{quantity}</Text>
                  <TouchableOpacity
                    onPress={() => quantity < 10 && setQuantity(q => q + 1)}
                    style={styles.qBtn}
                  >
                    <Ionicons name="add" size={18} color={colors.light.foreground} />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                style={styles.buyButton}
                onPress={() => {
                  if (!isAuthenticated) {
                    showToast({ message: 'Войдите в аккаунт', type: 'error' });
                    return;
                  }
                  setShowPayment(true);
                }}
              >
                <Text style={styles.buyButtonText}>
                  {event.priceValue === 0 ? 'Участвовать' : 'Купить'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <Modal
        visible={showPayment}
        animationType="none"
        transparent={true}
        onRequestClose={closePaymentModal}
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
            style={[styles.backdrop, { opacity: backdropOpacity }]} 
            accessible={false}
          >
            <TouchableOpacity
              style={styles.flex}
              activeOpacity={1}
              onPress={closePaymentModal}
            />
          </Animated.View>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <Animated.View
              style={[
                styles.paymentCard,
                { transform: [{ translateY: cardTranslateY }] },
              ]}
            >
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentTitle}>Оформление</Text>
                <TouchableOpacity onPress={closePaymentModal}>
                  <Ionicons name="close" size={28} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.paymentSummary}>
                  <Text style={styles.summaryText}>{event.title}</Text>
                  <Text style={styles.summaryPrice}>
                    {quantity} шт. — {(event.priceValue * quantity).toLocaleString()} ₸
                  </Text>
                </View>
                {event.priceValue > 0 && (
                  <View style={styles.cardInputContainer}>
                    <Text style={styles.inputLabel}>Номер карты</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0000 0000 0000 0000"
                      keyboardType="numeric"
                      maxLength={16}
                      value={cardNumber}
                      onChangeText={setCardNumber}
                    />
                    <View style={styles.row}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={styles.inputLabel}>ММ/ГГ</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="12/26"
                          keyboardType="numeric"
                          maxLength={5}
                          value={expiry}
                          onChangeText={setExpiry}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>CVV</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="***"
                          keyboardType="numeric"
                          maxLength={3}
                          secureTextEntry
                          value={cvv}
                          onChangeText={setCvv}
                        />
                      </View>
                    </View>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.payConfirmBtn, isProcessing && { opacity: 0.7 }]}
                  onPress={handleProcessPayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.payConfirmBtnText}>
                      {event.priceValue === 0 ? 'Подтвердить участие' : 'Оплатить'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function InfoBox({ icon, title, value }: { icon: any; title: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Ionicons name={`${icon}-outline` as any} size={18} color={colors.light.primary} />
      <View style={{ marginLeft: 8 }}>
        <Text style={styles.infoLabelSmall}>{title}</Text>
        <Text style={styles.infoValueSmall}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: colors.light.background },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  stickyHeaderContent: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60,
  },
  stickyHeaderTitle: { fontSize: 16, fontWeight: '700', color: colors.light.foreground },
  headerActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  scrollContent: { paddingBottom: 140 },
  imageWrapper: { width: width, height: 380, position: 'relative' },
  eventImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  mainContent: {
    marginTop: -30,
    backgroundColor: colors.light.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: spacing.lg,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.light.secondary,
  },
  viewsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.mutedForeground,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.light.foreground,
    lineHeight: 34,
    marginBottom: spacing.lg,
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  organizerAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  organizerInfo: { flex: 1 },
  organizerLabel: { fontSize: 11, color: colors.light.mutedForeground, marginBottom: 2 },
  organizerName: { fontSize: 15, fontWeight: '700', color: colors.light.foreground },
  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  infoBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    padding: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  infoLabelSmall: {
    fontSize: 10,
    color: colors.light.mutedForeground,
    textTransform: 'uppercase',
  },
  infoValueSmall: { fontSize: 13, fontWeight: '700', color: colors.light.foreground },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.xl,
  },
  locationIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.light.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationInfo: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    color: colors.light.mutedForeground,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.light.foreground },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.light.foreground,
    marginBottom: spacing.sm,
  },
  descriptionText: { fontSize: 15, color: colors.light.mutedForeground, lineHeight: 24 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.light.card,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: { flex: 1 },
  priceLabel: { fontSize: 11, color: colors.light.mutedForeground },
  totalPrice: { fontSize: 20, fontWeight: '800', color: colors.light.foreground },
  buyActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  quantityPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.secondary,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  qBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  qText: { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  buyButton: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 120,
  },
  buyButtonText: {
    color: colors.light.primaryForeground,
    fontWeight: '700',
    fontSize: 16,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  keyboardView: { justifyContent: 'flex-end' },
  flex: { flex: 1 },
  paymentCard: {
    backgroundColor: colors.light.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  paymentTitle: { fontSize: 22, fontWeight: '800', color: colors.light.foreground },
  paymentSummary: {
    padding: 20,
    backgroundColor: colors.light.secondary,
    borderRadius: 16,
    marginBottom: 24,
  },
  summaryText: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.light.foreground,
    marginBottom: 4,
  },
  summaryPrice: { color: colors.light.primary, fontWeight: '800', fontSize: 18 },
  cardInputContainer: { gap: 16, marginBottom: 32 },
  inputLabel: {
    fontSize: 12,
    color: colors.light.mutedForeground,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    backgroundColor: colors.light.card,
  },
  row: { flexDirection: 'row' },
  payConfirmBtn: {
    backgroundColor: colors.light.primary,
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
  },
  payConfirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 18 },
});
