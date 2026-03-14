import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Alert, Platform, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { format } from 'date-fns';

export default function FinanceScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation();
  const { organizerStats, fetchOrganizerStats, transactions, fetchTransactions } = useUserStore();

  const [showWithdrawModal, setShowWithdrawModal] = React.useState(false);
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [withdrawMethod, setWithdrawMethod] = React.useState('');

  useFocusEffect(
    React.useCallback(() => {
      fetchOrganizerStats();
      fetchTransactions();
    }, [])
  );

  const renderTransaction = ({ item }: { item: any }) => (
    <View style={styles.transactionCard}>
      <View>
        <Text style={styles.tTitle}>{item.eventTitle}</Text>
        <Text style={styles.tSub}>{item.buyerName} • {item.quantity} шт.</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.tAmount}>+{item.totalAmount} ₸</Text>
        <Text style={styles.tDate}>{format(new Date(item.date), 'dd.MM HH:mm')}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Финансы</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.balanceContainer}>
        <Text style={{ fontSize: typography.sm, color: themeColors.mutedForeground }}>
          Доступно к выводу
        </Text>
        <Text style={{ fontSize: 32, fontWeight: '800', marginVertical: 8 }}>
          {organizerStats.totalRevenue.toLocaleString()} ₸
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => setShowWithdrawModal(true)}>
          <Text style={{ color: colors.white, fontWeight: '700' }}>Вывести средства</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>История транзакций</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={{ padding: spacing.lg }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: themeColors.mutedForeground, marginTop: spacing.xl }}>
            Транзакций пока нет
          </Text>
        }
      />

      <Modal visible={showWithdrawModal} transparent animationType="fade" onRequestClose={() => setShowWithdrawModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>Вывод средств</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              <View>
                <Text style={[styles.tSub, { marginBottom: 4 }]}>Сумма для вывода (₸)</Text>
                <TextInput
                  style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.input, borderColor: themeColors.border }]}
                  placeholder="0"
                  placeholderTextColor={themeColors.mutedForeground}
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                />
              </View>
              <View>
                <Text style={[styles.tSub, { marginBottom: 4 }]}>Номер карты / IBAN</Text>
                <TextInput
                  style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.input, borderColor: themeColors.border }]}
                  placeholder="Номер счета"
                  placeholderTextColor={themeColors.mutedForeground}
                  value={withdrawMethod}
                  onChangeText={setWithdrawMethod}
                />
              </View>
              <TouchableOpacity
                style={[styles.btn, { marginTop: spacing.md }]}
                onPress={() => {
                  if (!withdrawAmount || !withdrawMethod) {
                    if (Platform.OS === 'web') window.alert('Ошибка: Заполните все поля');
                    else Alert.alert('Ошибка', 'Заполните все поля');
                    return;
                  }
                  setShowWithdrawModal(false);
                  setWithdrawAmount('');
                  setWithdrawMethod('');
                  if (Platform.OS === 'web') window.alert('Успех: Заявка на вывод отправлена и находится в обработке');
                  else Alert.alert('Успех', 'Заявка на вывод отправлена и находится в обработке');
                }}
              >
                <Text style={{ color: colors.white, fontWeight: '700', textAlign: 'center' }}>Подтвердить вывод</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  balanceContainer: {
    padding: spacing["2xl"],
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  btn: {
    backgroundColor: tc.foreground,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: { fontSize: typography.xl, fontWeight: '600' },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  tTitle: { fontWeight: '600', fontSize: typography.base, marginBottom: spacing.xs },
  tSub: { color: tc.mutedForeground, fontSize: typography.sm },
  tAmount: { fontWeight: '700', color: colors.success },
  tDate: { color: tc.mutedForeground, fontSize: typography.xs },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
    paddingBottom: spacing.md,
  },
  input: {
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
});
