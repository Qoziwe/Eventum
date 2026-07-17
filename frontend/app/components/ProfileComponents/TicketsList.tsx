import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useEventStore } from '../../store/eventStore'; // We import the event store
import { useUserStore } from '../../store/userStore';
import EventCard from '../EventCard';
import { spacing, typography, colors, borderRadius } from '../../theme/colors';
import { useThemeColors } from '../../store/themeStore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function TicketsList() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const { user } = useUserStore();
  const { events } = useEventStore(); // We get a dynamic list of all events
  const navigation = useNavigation<any>();

  if (!user.purchasedTickets || user.purchasedTickets.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="ticket-outline"
            size={48}
            color={themeColors.mutedForeground}
          />
        </View>
        <Text style={styles.emptyTitle}>You don't have tickets yet</Text>
        <Text style={styles.emptyDescription}>Once purchased, tickets will appear here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(user.purchasedTickets || []).map(ticket => {
        // We are looking for an event in the current store, and not in static data
        const event = events.find(e => e.id === ticket.eventId);
        if (!event) return null;

        return (
          <View key={ticket.id} style={styles.ticketWrapper}>
            <EventCard
              {...event}
              style={styles.card}
              onPress={() => navigation.navigate('TicketDetail', { event })}
            />
            <View style={styles.ticketInfo}>
              <Ionicons name="qr-code-outline" size={16} color={themeColors.primary} />
              <Text style={styles.ticketQty}>Tickets: {ticket.quantity} pcs.</Text>
              <Text style={styles.ticketDate}>
                Purchased: {new Date(ticket.purchaseDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  ticketWrapper: {
    marginBottom: spacing.lg,
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tc.border,
  },
  card: {
    width: '100%',
    marginBottom: 0,
    borderWidth: 0,
    borderRadius: 0,
  },
  ticketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: `${tc.primary}05`,
    gap: spacing.sm,
  },
  ticketQty: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: tc.foreground,
    flex: 1,
  },
  ticketDate: {
    fontSize: typography.xs,
    color: tc.mutedForeground,
  },
  emptyState: { alignItems: 'center', padding: spacing['3xl'] },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: tc.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: tc.foreground,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: typography.sm,
    color: tc.mutedForeground,
    textAlign: 'center',
  },
});
