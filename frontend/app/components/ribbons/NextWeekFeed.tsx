import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme/colors';
import { useThemeColors } from '../../store/themeStore';
import EventCard, { EventItem } from '../EventCard';

interface NextWeekFeedProps {
  title?: string;
  subtitle?: string;
  events: EventItem[];
  onEventPress?: (event: EventItem) => void;
  cardStyle?: ViewStyle;
}

const SCROLL_STEP = 300;

export default function NextWeekFeed({
  title = 'На следующей неделе',
  subtitle = 'Самые интересные события',
  events,
  onEventPress,
  cardStyle,
}: NextWeekFeedProps) {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const scrollRef = useRef<ScrollView>(null);
  const [currentX, setCurrentX] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrentX(event.nativeEvent.contentOffset.x);
  };

  const scrollLeft = () => {
    scrollRef.current?.scrollTo({
      x: Math.max(0, currentX - SCROLL_STEP),
      animated: true,
    });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollTo({
      x: currentX + SCROLL_STEP,
      animated: true,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={scrollLeft}>
            <Ionicons name="chevron-back" size={16} color={themeColors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={scrollRight}>
            <Ionicons name="chevron-forward" size={16} color={themeColors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.eventsContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {events.map(event => (
          <EventCard
            key={event.id}
            {...event}
            onPress={() => onEventPress?.(event)}
            style={cardStyle}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: { paddingVertical: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: { fontSize: typography.xl, fontWeight: '700', color: tc.foreground },
  subtitle: {
    fontSize: typography.sm,
    color: tc.mutedForeground,
    marginTop: spacing.xs,
  },
  controls: { flexDirection: 'row', gap: spacing.sm },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: tc.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsContainer: { paddingHorizontal: spacing.lg, gap: spacing.md, minHeight: 200 },
});
