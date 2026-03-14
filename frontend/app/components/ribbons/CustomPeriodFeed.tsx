import type React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme/colors';
import { useThemeColors } from '../../store/themeStore';
import EventPlaceholder from '../../assets/placeholder.jpg';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const CARD_HEIGHT = 280;

interface Event {
  id: string;
  title: string;
  image: any;
  date: string;
  location: string;
  price: string;
  isPaid: boolean;
  isPromoted: boolean;
}

interface CustomPeriodFeedProps {
  events: Event[];
  dateRangeLabel?: string;
  onEventPress?: (event: Event) => void;
}

export const CustomPeriodFeed: React.FC<CustomPeriodFeedProps> = ({
  events,
  dateRangeLabel = 'Выбранный период',
  onEventPress,
}) => {
  const themeColors = useThemeColors();
  const renderEventCard = ({ item }: { item: Event }) => (
    <TouchableOpacity activeOpacity={0.8} style={styles.cardContainer} onPress={() => onEventPress?.(item)}>
      <View style={styles.card}>
        <Image
          source={
            !item.image || item.image === ''
              ? EventPlaceholder
              : typeof item.image === 'string'
                ? { uri: item.image }
                : item.image
          }
          style={styles.cardImage}
        />
        <View style={styles.badgesContainer}>
          {item.isPromoted && (
            <View style={styles.promotedBadge}>
              <Text style={[styles.promotedText, { color: themeColors.foreground }]}>Featured</Text>
            </View>
          )}
        </View>
        <View style={styles.gradient} />
        <View style={styles.contentContainer}>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.date} numberOfLines={1}>
            {item.date}
          </Text>
          <Text style={styles.location} numberOfLines={1}>
            📍 {item.location}
          </Text>
          <View style={styles.footerContainer}>
            <View>
              <Text style={styles.priceLabel}>From</Text>
              <Text style={styles.price}>{item.price}</Text>
            </View>
            <TouchableOpacity style={styles.notifyButton} onPress={() => Alert.alert('Уведомления', 'Вы успешно подписались на уведомления об этом событии!')}>
              <Text style={styles.notifyButtonText}>Notify Me</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity >
  );

  const renderSectionHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>Пользовательский период</Text>
      <Text style={[styles.sectionSubtitle, { color: themeColors.mutedForeground }]}>{dateRangeLabel}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {renderSectionHeader()}
      <FlatList
        data={events}
        renderItem={renderEventCard}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.listContentContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  headerContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: typography["3xl"],
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: typography.base,
    marginTop: 4,
  },
  listContentContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  cardContainer: {
    width: CARD_WIDTH,
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  badgesContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  promotedBadge: {
    backgroundColor: colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  promotedText: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    zIndex: 1,
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,

  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 6,
    lineHeight: 20,
  },
  date: {
    fontSize: typography.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.xs,
  },
  location: {
    fontSize: typography.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.sm,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceLabel: {
    fontSize: typography.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  price: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.gold,
  },
  notifyButton: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  notifyButtonText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.black,
  },
});
