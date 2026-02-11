import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { useUserStore } from '../store/userStore';
import { LineChart } from '../components/Charts/LineChart';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function AnalyticsScreen() {
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
                   <Text style={{ fontWeight: '600', fontSize: 16 }}>{event.title}</Text>
                   <Text style={{ color: colors.light.mutedForeground, fontSize: 12 }}>
                     {format(new Date(event.date), 'dd MMM yyyy', { locale: ru })}
                   </Text>
                 </View>
                 <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '700' }}>{event.revenue.toLocaleString()} ₸</Text>
                    <Text style={{ fontSize: 12 }}>{event.sold} билетов</Text>
                    <Text style={{ fontSize: 10, color: colors.light.mutedForeground }}>{event.views} прос.</Text>
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
          <Ionicons name="arrow-back" size={24} color={colors.light.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Аналитика</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="reload" size={20} color={colors.light.foreground} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabs: { flexDirection: 'row', padding: 16, paddingBottom: 0 },
  tab: { 
    marginRight: 16, 
    paddingBottom: 8, 
    borderBottomWidth: 2, 
    borderBottomColor: 'transparent' 
  },
  activeTab: { borderBottomColor: colors.light.primary },
  tabText: { color: colors.light.mutedForeground, fontWeight: '600' },
  activeTabText: { color: colors.light.primary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  card: {
    padding: 20,
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 12,
  },
  val: { fontSize: 24, fontWeight: '800' },
  lbl: { color: colors.light.mutedForeground, fontSize: 12 },
});
