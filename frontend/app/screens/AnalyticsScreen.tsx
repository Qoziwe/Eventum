import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { LineChart } from '../components/Charts/LineChart';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function AnalyticsScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation();
  const { 
    organizerStats, 
    fetchOrganizerStats,
    analyticsSales,
    fetchSalesAnalytics,
    analyticsViews,
    fetchViewsAnalytics,
    eventsReport,
    fetchEventsReport
  } = useUserStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'audience' | 'events'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchOrganizerStats(),
      fetchSalesAnalytics(30),
      fetchViewsAnalytics(30),
      fetchEventsReport()
    ]);
    setRefreshing(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  // Prepare Chart Data
  const salesLabels = analyticsSales.slice(-7).map(d => format(new Date(d.date), 'dd.MM'));
  const salesValues = analyticsSales.slice(-7).map(d => d.count);
  
  const viewsLabels = analyticsViews.slice(-7).map(d => format(new Date(d.date), 'dd.MM'));
  const viewsValues = analyticsViews.slice(-7).map(d => d.count);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.card, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.val}>{organizerStats.totalRevenue.toLocaleString()}</Text>
                <Text style={styles.lbl}>Выручка (₸)</Text>
              </View>
              <View style={[styles.card, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.val}>{organizerStats.ticketsSold}</Text>
                <Text style={styles.lbl}>Билетов</Text>
              </View>
            </View>

            <LineChart
              title="Продажи (последние 7 дней)"
              data={{
                labels: salesLabels.length > 0 ? salesLabels : ['Нет данных'],
                datasets: [{ data: salesValues.length > 0 ? salesValues : [0] }]
              }}
              yAxisLabel=""
              yAxisSuffix=""
            />
          </>
        );
      case 'audience':
        return (
          <>
            <View style={styles.card}>
              <Text style={styles.val}>{organizerStats.totalViews}</Text>
              <Text style={styles.lbl}>Всего просмотров</Text>
            </View>
            <LineChart
              title="Просмотры (последние 7 дней)"
              data={{
                labels: viewsLabels.length > 0 ? viewsLabels : ['Нет данных'],
                datasets: [{ 
                  data: viewsValues.length > 0 ? viewsValues : [0],
                  color: (opacity = 1) => `rgba(32, 193, 237, ${opacity})`
                }]
              }}
            />
          </>
        );
      case 'events':
        return (
          <View>
             {eventsReport.map(event => (
               <View key={event.id} style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
                 <View style={{ flex: 1 }}>
                   <Text style={{ fontWeight: '600', fontSize: typography.lg }}>{event.title}</Text>
                   <Text style={{ color: themeColors.mutedForeground, fontSize: typography.sm }}>
                     {format(new Date(event.date), 'dd MMM yyyy', { locale: ru })}
                   </Text>
                 </View>
                 <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '700' }}>{event.revenue.toLocaleString()} ₸</Text>
                    <Text style={{ fontSize: typography.sm }}>{event.sold} билетов</Text>
                    <Text style={{ fontSize: typography.xs, color: themeColors.mutedForeground }}>{event.views} прос.</Text>
                 </View>
               </View>
             ))}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Аналитика</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="reload" size={20} color={themeColors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['overview', 'audience', 'events'] as const).map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'overview' ? 'Обзор' : tab === 'audience' ? 'Аудитория' : 'События'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: tc.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  headerTitle: { fontSize: typography.xl, fontWeight: '700' },
  tabs: { flexDirection: 'row', padding: spacing.lg, paddingBottom: 0 },
  tab: { 
    marginRight: 16, 
    paddingBottom: 8, 
    borderBottomWidth: 2, 
    borderBottomColor: 'transparent' 
  },
  activeTab: { borderBottomColor: tc.primary },
  tabText: { color: tc.mutedForeground, fontWeight: '600' },
  activeTabText: { color: tc.primary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  card: {
    padding: 20,
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: tc.border,
    marginBottom: 12,
  },
  val: { fontSize: typography["3xl"], fontWeight: '800' },
  lbl: { color: tc.mutedForeground, fontSize: typography.sm },
});
