import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import { apiClient } from '../api/apiClient';
import { useConfigStore, City, District, Category, Vibe } from '../store/configStore';
import { useToast } from '../components/ToastProvider';

export default function AdminSettingsScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation<any>();
  const { fetchConfig } = useConfigStore();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cities' | 'categories' | 'vibes' | 'general'>('general');

  // General Settings
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [platformName, setPlatformName] = useState('Eventum');

  // Data lists
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vibes, setVibes] = useState<Vibe[]>([]);

  // Modals
  const [showCityModal, setShowCityModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showVibeModal, setShowVibeModal] = useState(false);

  // Form states
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const confRes = await apiClient('admin/config');
      if (confRes) {
        setCurrencySymbol(confRes.currency_symbol || '$');
        setPlatformName(confRes.platform_name || 'Eventum');
      }

      const citiesRes = await apiClient('admin/cities');
      if (citiesRes) setCities(citiesRes);

      const catRes = await apiClient('admin/categories');
      if (catRes) setCategories(catRes);

      const vibeRes = await apiClient('admin/vibes');
      if (vibeRes) setVibes(vibeRes);
    } catch (e) {
      console.error(e);
      showToast({ message: 'Error loading settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const saveGeneralSettings = async () => {
    try {
      await apiClient('admin/config', {
        method: 'PUT',
        body: JSON.stringify({ currency_symbol: currencySymbol, platform_name: platformName }),
      });
      showToast({ message: 'Settings saved', type: 'success' });
      fetchConfig();
    } catch (e) {
      showToast({ message: 'Error saving settings', type: 'error' });
    }
  };

  const handleSaveCity = async () => {
    try {
      if (editId) {
        await apiClient(`admin/cities/${editId}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await apiClient('admin/cities', { method: 'POST', body: JSON.stringify(formData) });
      }
      setShowCityModal(false);
      loadData();
      fetchConfig();
    } catch (e) {
      showToast({ message: 'Error saving city', type: 'error' });
    }
  };

  const handleDeleteCity = async (id: number) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this city?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient(`admin/cities/${id}`, { method: 'DELETE' });
            loadData();
            fetchConfig();
          } catch (e) {
            showToast({ message: 'Error deleting city', type: 'error' });
          }
        },
      },
    ]);
  };

  const handleSaveCategory = async () => {
    try {
      if (editId) {
        await apiClient(`admin/categories/${editId}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await apiClient('admin/categories', { method: 'POST', body: JSON.stringify(formData) });
      }
      setShowCatModal(false);
      loadData();
      fetchConfig();
    } catch (e) {
      showToast({ message: 'Error saving category', type: 'error' });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    Alert.alert('Confirm Delete', 'Delete this category?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient(`admin/categories/${id}`, { method: 'DELETE' });
            loadData();
            fetchConfig();
          } catch (e) {
            showToast({ message: 'Error deleting category', type: 'error' });
          }
        },
      },
    ]);
  };

  const renderTab = (key: string, label: string) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === key && styles.tabActive]}
      onPress={() => setActiveTab(key as any)}
    >
      <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.fullContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.fullContainer} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Platform Settings</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.tabsContainer}>
        {renderTab('general', 'General')}
        {renderTab('cities', 'Cities')}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: spacing.md }}>
        {activeTab === 'general' && (
          <View style={styles.section}>
            <Text style={styles.label}>Platform Name</Text>
            <TextInput
              style={styles.input}
              value={platformName}
              onChangeText={setPlatformName}
            />
            <Text style={styles.label}>Currency Symbol (e.g. $, €, ₸)</Text>
            <TextInput
              style={styles.input}
              value={currencySymbol}
              onChangeText={setCurrencySymbol}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveGeneralSettings}>
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'cities' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setEditId(null);
                setFormData({ name: '', sortOrder: 0 });
                setShowCityModal(true);
              }}
            >
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.addBtnText}>Add City</Text>
            </TouchableOpacity>

            {cities.map((city) => (
              <View key={city.id} style={styles.listItem}>
                <Text style={styles.itemText}>{city.name}</Text>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditId(city.id);
                      setFormData({ name: city.name, sortOrder: city.sortOrder });
                      setShowCityModal(true);
                    }}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="pencil" size={18} color={themeColors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteCity(city.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="trash" size={18} color={themeColors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'categories' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setEditId(null);
                setFormData({ slug: '', label: '', icon: 'apps-outline', type: 'both' });
                setShowCatModal(true);
              }}
            >
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.addBtnText}>Add Category</Text>
            </TouchableOpacity>

            {categories.map((cat) => (
              <View key={cat.id} style={styles.listItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name={cat.icon as any} size={20} color={themeColors.primary} />
                  <View>
                    <Text style={styles.itemText}>{cat.label}</Text>
                    <Text style={styles.itemSubtext}>{cat.slug} • {cat.type}</Text>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditId(cat.id);
                      setFormData(cat);
                      setShowCatModal(true);
                    }}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="pencil" size={18} color={themeColors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteCategory(cat.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="trash" size={18} color={themeColors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* City Modal */}
      <Modal visible={showCityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editId ? 'Edit City' : 'Add City'}</Text>
            <TextInput
              style={styles.input}
              placeholder="City Name"
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowCityModal(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={handleSaveCity}>
                <Text style={styles.modalBtnTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal visible={showCatModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editId ? 'Edit Category' : 'Add Category'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Slug (e.g. music)"
              value={formData.slug}
              onChangeText={(t) => setFormData({ ...formData, slug: t })}
              editable={!editId}
            />
            <TextInput
              style={styles.input}
              placeholder="Label (e.g. Music)"
              value={formData.label}
              onChangeText={(t) => setFormData({ ...formData, label: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Ionicons Icon Name"
              value={formData.icon}
              onChangeText={(t) => setFormData({ ...formData, icon: t })}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowCatModal(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={handleSaveCategory}>
                <Text style={styles.modalBtnTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    fullContainer: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerBtn: { padding: spacing.xs },
    headerTitle: { fontSize: typography.lg, fontWeight: '700', color: theme.foreground },
    tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border },
    tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: theme.primary },
    tabText: { fontSize: typography.sm, color: theme.mutedForeground, fontWeight: '500' },
    tabTextActive: { color: theme.primary, fontWeight: '700' },
    content: { flex: 1 },
    section: { paddingBottom: spacing.xl },
    label: { fontSize: typography.sm, fontWeight: '500', color: theme.foreground, marginBottom: spacing.xs, marginTop: spacing.md },
    input: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, padding: spacing.md, fontSize: typography.base, color: theme.foreground, marginBottom: spacing.sm },
    saveBtn: { backgroundColor: theme.primary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.md },
    saveBtnText: { color: colors.white, fontSize: typography.base, fontWeight: '700' },
    addBtn: { backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg, gap: spacing.sm },
    addBtnText: { color: colors.white, fontSize: typography.base, fontWeight: '700' },
    listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.card, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: theme.border },
    itemText: { fontSize: typography.base, fontWeight: '500', color: theme.foreground },
    itemSubtext: { fontSize: typography.sm, color: theme.mutedForeground, marginTop: 2 },
    itemActions: { flexDirection: 'row', gap: spacing.sm },
    actionBtn: { padding: spacing.sm, backgroundColor: theme.background, borderRadius: borderRadius.sm },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
    modalContent: { backgroundColor: theme.background, borderRadius: borderRadius.lg, padding: spacing.lg },
    modalTitle: { fontSize: typography.lg, fontWeight: '700', color: theme.foreground, marginBottom: spacing.lg },
    modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    modalBtnCancel: { flex: 1, padding: spacing.md, alignItems: 'center', backgroundColor: theme.card, borderRadius: borderRadius.md, borderWidth: 1, borderColor: theme.border },
    modalBtnSave: { flex: 1, padding: spacing.md, alignItems: 'center', backgroundColor: theme.primary, borderRadius: borderRadius.md },
    modalBtnText: { color: theme.foreground, fontWeight: '500' },
    modalBtnTextSave: { color: colors.white, fontWeight: '700' },
  });
