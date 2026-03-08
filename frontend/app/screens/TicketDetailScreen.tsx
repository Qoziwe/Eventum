import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import EventPlaceholder from '../assets/placeholder.jpg';
import { useUserStore } from '../store/userStore';

const { width } = Dimensions.get('window');

export default function TicketDetailScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user } = useUserStore();

  const { event } = route.params;
  // Ищем данные о билете в сторе пользователя
  const ticket = user.purchasedTickets.find(t => t.eventId === event.id);

  const handleBack = () => navigation.goBack();

  return (
    <SafeAreaView style={styles.fullContainer} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={themeColors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Электронный билет</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ticketCard}>
          {/* Инфо о событии */}
          <View style={styles.eventInfoSection}>
            <Image
              source={
                !event.image || event.image === '' || typeof event.image !== 'string'
                  ? EventPlaceholder
                  : { uri: event.image }
              }
              style={styles.eventImage}
            />
            <View style={styles.eventTextContent}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <View style={styles.infoRow}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={themeColors.primary}
                />
                <Text style={styles.infoText}>{event.date}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={themeColors.primary}
                />
                <Text style={styles.infoText} numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            </View>
          </View>

          {/* Разделительная линия (перфорация) */}
          <View style={styles.dividerContainer}>
            <View style={styles.circleLeft} />
            <View style={styles.dashedLine} />
            <View style={styles.circleRight} />
          </View>

          {/* QR-код и детали билета */}
          <View style={styles.qrSection}>
            <Text style={styles.qrLabel}>Покажите этот код организатору</Text>

            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code" size={180} color={themeColors.foreground} />
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Билетов</Text>
                <Text style={styles.detailValue}>{ticket?.quantity || 1} шт.</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>ID Заказа</Text>
                <Text style={styles.detailValue}>
                  {ticket?.id.split('-')[1] || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>АКТИВЕН</Text>
            </View>
          </View>
        </View>

        <View style={styles.instructions}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={themeColors.mutedForeground}
          />
          <Text style={styles.instructionsText}>
            Билет действителен для однократного входа. Не показывайте QR-код посторонним
            лицам до мероприятия.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: tc.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: tc.foreground,
  },
  scrollContent: { padding: spacing.lg, alignItems: 'center' },
  ticketCard: {
    width: '100%',
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: tc.border,
    overflow: 'hidden',
    elevation: 4,
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
  },
  eventInfoSection: { padding: spacing.lg, flexDirection: 'row', gap: spacing.md },
  eventImage: { width: 80, height: 80, borderRadius: borderRadius.lg },
  eventTextContent: { flex: 1, justifyContent: 'center', gap: spacing.xs },
  eventTitle: {
    fontSize: typography.xl,
    fontWeight: '800',
    color: tc.foreground,
    marginBottom: spacing.xs,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: tc.mutedForeground },

  dividerContainer: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tc.background,
    marginLeft: -10,
    borderWidth: 1,
    borderColor: tc.border,
  },
  circleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tc.background,
    marginRight: -10,
    borderWidth: 1,
    borderColor: tc.border,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: tc.border,
    marginHorizontal: 10,
  },

  qrSection: { padding: spacing.xl, alignItems: 'center' },
  qrLabel: {
    fontSize: typography.sm,
    color: tc.mutedForeground,
    marginBottom: spacing.xl,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  qrPlaceholder: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
  },
  detailsGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: tc.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  detailLabel: {
    fontSize: typography.xs,
    color: tc.mutedForeground,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  detailValue: { fontSize: typography.lg, fontWeight: '700', color: tc.foreground },

  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: spacing.sm,
    backgroundColor: '#DCFCE7',
    borderRadius: borderRadius.full,
  },
  statusText: { color: colors.successText, fontWeight: '800', fontSize: typography.sm },

  instructions: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  instructionsText: {
    flex: 1,
    fontSize: typography.sm,
    color: tc.mutedForeground,
    lineHeight: 18,
  },
});
