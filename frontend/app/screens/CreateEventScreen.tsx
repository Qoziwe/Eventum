import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import { useEventStore } from '../store/eventStore';
import { useUserStore } from '../store/userStore';
import { useConfigStore } from '../store/configStore';
import { useToast } from '../components/ToastProvider';
import { ALL_INTERESTS } from '../data/userMockData';
import { sanitizeText } from '../utils/security';
import { validateEventDate } from '../utils/dateUtils';
import { apiClient } from '../api/apiClient';

const MONTHS = [
  { id: 'm0', label: 'Jan', value: '0' },
  { id: 'm1', label: 'Feb', value: '1' },
  { id: 'm2', label: 'Mar', value: '2' },
  { id: 'm3', label: 'Apr', value: '3' },
  { id: 'm4', label: 'May', value: '4' },
  { id: 'm5', label: 'Jun', value: '5' },
  { id: 'm6', label: 'Jul', value: '6' },
  { id: 'm7', label: 'Aug', value: '7' },
  { id: 'm8', label: 'Sep', value: '8' },
  { id: 'm9', label: 'Oct', value: '9' },
  { id: 'm10', label: 'Nov', value: '10' },
  { id: 'm11', label: 'Dec', value: '11' },
];

// Dynamic calendar helpers — computed at runtime so they stay current
const getDynamicYears = () => {
  const now = new Date();
  const y = now.getFullYear();
  return [
    { id: `y${y}`, label: `${y}`, value: `${y}` },
    { id: `y${y + 1}`, label: `${y + 1}`, value: `${y + 1}` },
    { id: `y${y + 2}`, label: `${y + 2}`, value: `${y + 2}` },
  ];
};

const getDaysForMonth = (month: string, year: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const m = month !== '' ? parseInt(month) : today.getMonth();
  const y = year !== '' ? parseInt(year) : today.getFullYear();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const candidate = new Date(y, m, d);
    candidate.setHours(0, 0, 0, 0);
    if (candidate >= today) {
      days.push({ id: `d${d}`, label: `${d}`, value: `${d}` });
    }
  }
  return days;
};

const getAvailableMonths = (year: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const y = year !== '' ? parseInt(year) : today.getFullYear();
  return MONTHS.filter(m => {
    const lastDayOfMonth = new Date(y, parseInt(m.value) + 1, 0);
    return lastDayOfMonth >= today;
  });
};

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

const VIBES = [
  { id: 'active', label: 'Active', icon: 'flash' },
  { id: 'chill', label: 'Calm', icon: 'leaf' },
  { id: 'family', label: 'Family', icon: 'people' },
  { id: 'romantic', label: 'Romantic', icon: 'heart' },
  { id: 'party', label: 'Party', icon: 'wine' },
];

export default function CreateEventScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { addEvent, updateEvent, deleteEvent } = useEventStore();
  const { user } = useUserStore();
  const { cities } = useConfigStore();
  const { showToast } = useToast();

  const editEvent = route.params?.event;

  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');

  const [selDay, setSelDay] = useState('');
  const [selMonth, setSelMonth] = useState('');
  const [selYear, setSelYear] = useState('');

  const [startH, setStartH] = useState('');
  const [startM, setStartM] = useState('');
  const [endH, setEndH] = useState('');
  const [endM, setEndM] = useState('');

  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [vibe, setVibe] = useState('');
  const [ageLimit, setAgeLimit] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title || '');
      setDescription(editEvent.fullDescription || '');

      if (editEvent.location) {
        const parts = editEvent.location.split(', ');
        setLocation(parts[0] || '');
        setCity(editEvent.city || '');
        const districtToSet =
          editEvent.district || (parts.length > 1 ? parts[parts.length - 1] : '');
        const foundDistrict = DISTRICTS.find(d => d.trim() === districtToSet.trim());
        if (foundDistrict) {
          setDistrict(foundDistrict);
        }
      }

      setPrice(editEvent.priceValue?.toString() || '0');

      // Corrected category selection logic
      let eventCat = '';
      if (editEvent.categories && editEvent.categories.length > 0) {
        eventCat = editEvent.categories[0];
      } else if (editEvent.category) {
        eventCat = editEvent.category;
      } else if (editEvent.tags && editEvent.tags.length > 0) {
        // Search for a category among tags as a fallback option
        const possibleCat = ALL_INTERESTS.find(c => 
          editEvent.tags.some((t: string) => t.toLowerCase() === c.toLowerCase())
        );
        if (possibleCat) eventCat = possibleCat;
      }

      if (eventCat) {
        const foundCat = ALL_INTERESTS.find(
          c => c.toLowerCase().trim() === eventCat.toLowerCase().trim()
        );
        if (foundCat) {
          setCategory(foundCat);
        }
      }

      setVibe(editEvent.vibe || '');
      setAgeLimit(editEvent.ageLimit?.toString() || '');
      setImageUrl(editEvent.image || '');

      const dateObj = new Date(editEvent.timestamp);
      if (!isNaN(dateObj.getTime())) {
        setSelDay(dateObj.getDate().toString());
        setSelMonth(dateObj.getMonth().toString());
        setSelYear(dateObj.getFullYear().toString());
        setStartH(dateObj.getHours().toString().padStart(2, '0'));
        setStartM(dateObj.getMinutes().toString().padStart(2, '0'));

        if (editEvent.timeRange) {
          const times = editEvent.timeRange.split(' — ');
          if (times.length === 2) {
            const endTime = times[1].split(':');
            if (endTime.length === 2) {
              setEndH(endTime[0]);
              setEndM(endTime[1]);
            }
          }
        }
      }
    }
  }, [editEvent]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUrl(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Pick image error:', error);
      showToast({ message: 'Error when selecting image', type: 'error' });
    }
  };

  const uploadImageToServer = async (uri: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      let filename = uri.split('/').pop();

      if (!filename || !filename.includes('.')) {
        filename = `image_${Date.now()}.jpg`;
      }

      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('image', blob, filename);
      } else {
        formData.append('image', {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: filename,
          type,
        } as any);
      }

      if (editEvent && editEvent.image && editEvent.image.startsWith('http')) {
        formData.append('oldImage', editEvent.image);
      }

      const res = await apiClient('events/upload-image', {
        method: 'POST',
        body: formData,
      });

      return res.imageUrl || null;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!imageUrl) {
        showToast({ message: 'Download the event cover', type: 'error' });
        return;
      }
      if (!title.trim()) {
        showToast({ message: 'Enter event name', type: 'error' });
        return;
      }
      if (!description.trim()) {
        showToast({ message: 'Enter event description', type: 'error' });
        return;
      }
    }

    if (step === 2) {
      if (!city) {
        showToast({ message: 'Select a city', type: 'error' });
        return;
      }
      if (!location.trim()) {
        showToast({ message: 'Enter the address of the event', type: 'error' });
        return;
      }
      if (!district) {
        showToast({ message: 'Select area', type: 'error' });
        return;
      }
      if (!selDay || !selMonth || !selYear) {
        showToast({ message: 'Select date', type: 'error' });
        return;
      }
      if (!startH || !startM || !endH || !endM) {
        showToast({ message: 'Select start and end time', type: 'error' });
        return;
      }
    }

    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete event?',
      'Are you sure you want to permanently delete this event??',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (editEvent && editEvent.id) {
                await deleteEvent(editEvent.id);
                showToast({ message: 'Event deleted', type: 'success' });
                navigation.navigate('MainTabs', { screen: 'Profile' });
              }
            } catch (error) {
              showToast({ message: 'Error during deletion', type: 'error' });
            }
          },
        },
      ]
    );
  };

  const handleFinish = async () => {
    if (editEvent) {
      if (!user.id || editEvent.organizerId !== user.id) {
        showToast({
          message: 'You do not have permission to edit this event',
          type: 'error',
        });
        navigation.goBack();
        return;
      }
    }

    if (!editEvent && user.userType !== 'organizer') {
      showToast({
        message: 'Only organizers can create events',
        type: 'error',
      });
      navigation.goBack();
      return;
    }

    // Final Step Validation 3
    if (!category) {
      showToast({ message: 'Select category', type: 'error' });
      return;
    }
    if (!vibe) {
      showToast({ message: 'Select the vibe of the event', type: 'error' });
      return;
    }
    if (price === '') {
      showToast({ message: 'Please indicate the price (0 for free)', type: 'error' });
      return;
    }
    if (!ageLimit) {
      showToast({ message: 'Specify age limit', type: 'error' });
      return;
    }

    setIsUploading(true);

    try {
      let finalImageUrl = imageUrl;

      if (imageUrl && !imageUrl.startsWith('http')) {
        const uploadedUrl = await uploadImageToServer(imageUrl);
        if (!uploadedUrl) {
          showToast({ message: 'Error loading image', type: 'error' });
          setIsUploading(false);
          return;
        }
        finalImageUrl = uploadedUrl;
      }

      const dateValidation = validateEventDate(selYear, selMonth, selDay);
      if (!dateValidation.valid) {
        showToast({
          message: dateValidation.message || 'Invalid date',
          type: 'error',
        });
        setIsUploading(false);
        return;
      }

      const monthLabel = MONTHS.find(m => m.value === selMonth)?.label;
      const dateString = `${selDay} ${monthLabel}, ${selYear}`;
      const timeRangeString = `${startH}:${startM} — ${endH}:${endM}`;

      const tsDate = new Date(
        parseInt(selYear),
        parseInt(selMonth),
        parseInt(selDay),
        parseInt(startH),
        parseInt(startM)
      );

      if (isNaN(tsDate.getTime())) {
        showToast({ message: 'Invalid date or time', type: 'error' });
        setIsUploading(false);
        return;
      }

      const sanitizedTitle = sanitizeText(title);
      const sanitizedDescription = sanitizeText(description);
      const sanitizedLocation = sanitizeText(location);

      const eventData = {
        ...(editEvent ? { id: editEvent.id } : {}),
        organizerId: user.id!,
        title: sanitizedTitle,
        date: dateString,
        timestamp: tsDate.getTime(),
        location: `${sanitizedLocation}, ${district}`,
        price: price === '0' || price === '' ? 'Free' : `${price}$`,
        priceValue: parseInt(price) || 0,
        categories: [category.toLowerCase()],
        vibe: vibe as any,
        district,
        city,
        ageLimit: parseInt(ageLimit) || 0,
        tags: [category, vibe],
        stats: editEvent ? editEvent.stats : 0,
        image: finalImageUrl,
        fullDescription: sanitizedDescription,
        organizerName: sanitizeText(user.name || 'Organizer'),
        organizerAvatar: user.avatarUrl || '',
        timeRange: timeRangeString,
      };

      if (editEvent) {
        await updateEvent(eventData as any);
        showToast({ message: 'Event updated', type: 'success' });
        navigation.navigate('EventDetail', { ...eventData });
      } else {
        await addEvent(eventData as any);
        showToast({ message: 'Event sent for moderation', type: 'success' });
        navigation.navigate('MainTabs', {
          screen: 'Profile',
          params: { screen: 'ProfileMain' },
        });
      }
    } catch (error: any) {
      showToast({
        message: error.message || 'Error saving event',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const renderPickerItem = (item: any, current: string, setter: (v: string) => void) => (
    <TouchableOpacity
      onPress={() => setter(item.value || item)}
      style={[
        styles.pickerOpt,
        (item.value === current || item === current) && styles.pickerOptActive,
      ]}
    >
      <Text
        style={[
          styles.pickerOptText,
          (item.value === current || item === current) && styles.pickerOptTextActive,
        ]}
      >
        {item.label || item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.fullContainer} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={themeColors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {editEvent ? 'Editing' : 'New event'}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
          </View>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.stepIndicator}>Step {step} from 3</Text>

          {step === 1 && (
            <View style={styles.formSection}>
              <Text style={styles.label}>Event cover *</Text>
              <TouchableOpacity
                style={[
                  styles.imageUploadContainer,
                  imageUrl ? styles.imageUploaded : null,
                ]}
                onPress={pickImage}
                disabled={isUploading}
              >
                {imageUrl ? (
                  <>
                    <Image source={{ uri: imageUrl }} style={styles.previewImage} />
                    <View style={styles.changeImageBadge}>
                      <Ionicons name="camera" size={16} color={colors.white} />
                      <Text style={styles.changeImageText}>Change photo</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Ionicons
                      name="image-outline"
                      size={48}
                      color={themeColors.mutedForeground}
                    />
                    <Text style={styles.placeholderText}>
                      Click to select photo
                    </Text>
                    <Text style={styles.placeholderSubtext}>
                      Recommended size 16:9
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Event name *</Text>
              <TextInput
                style={styles.input}
                placeholder="What is the name of your event??"
                value={title}
                onChangeText={setTitle}
              />
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe in detail what awaits guests..."
                multiline
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />
            </View>
          )}

          {step === 2 && (
            <View style={styles.formSection}>
              <Text style={styles.label}>City *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.catScroll}
              >
                <View style={styles.chipGridHorizontal}>
                  {cities.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, city === c.name && styles.chipActive]}
                      onPress={() => setCity(c.name)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          city === c.name && styles.chipTextActive,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="Street, house, place name"
                value={location}
                onChangeText={setLocation}
              />

              <Text style={styles.label}>District (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Medeusky, Almalinsky..."
                value={district}
                onChangeText={setDistrict}
              />

              <Text style={styles.label}>When? *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={themeColors.primary}
                />
                <Text
                  style={[
                    styles.selectorText,
                    !selDay && { color: themeColors.mutedForeground },
                  ]}
                >
                  {selDay
                    ? `${selDay} ${MONTHS.find(m => m.value === selMonth)?.label} ${selYear}`
                    : 'Select date'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Start and end time *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color={themeColors.primary} />
                <Text
                  style={[
                    styles.selectorText,
                    !startH && { color: themeColors.mutedForeground },
                  ]}
                >
                  {startH ? `WITH ${startH}:${startM} to ${endH}:${endM}` : 'Select time'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View style={styles.formSection}>
              <Text style={styles.label}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.catScroll}
              >
                <View style={styles.chipGridHorizontal}>
                  {ALL_INTERESTS.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, category === cat && styles.chipActive]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          category === cat && styles.chipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>Vibe (atmosphere) *</Text>
              <View style={styles.vibeGrid}>
                {VIBES.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vibeCard, vibe === v.id && styles.vibeCardActive]}
                    onPress={() => setVibe(v.id)}
                  >
                    <Ionicons
                      name={v.icon as any}
                      size={20}
                      color={
                        vibe === v.id
                          ? themeColors.primary
                          : themeColors.mutedForeground
                      }
                    />
                    <Text
                      style={[styles.vibeLabel, vibe === v.id && styles.vibeLabelActive]}
                    >
                      {v.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Price ($) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Age *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="18"
                    keyboardType="numeric"
                    value={ageLimit}
                    onChangeText={setAgeLimit}
                  />
                </View>
              </View>
            </View>
          )}

          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[styles.btnMain, step === 3 && styles.btnFinish]}
              onPress={step === 3 ? handleFinish : handleNext}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.btnMainText}>
                    {step === 3
                      ? editEvent
                        ? 'Save'
                        : 'Publish'
                      : 'Continue'}
                  </Text>
                  <Ionicons
                    name={
                      step === 3 ? (editEvent ? 'save' : 'rocket') : 'chevron-forward'
                    }
                    size={18}
                    color={colors.white}
                  />
                </>
              )}
            </TouchableOpacity>

            {step === 3 && editEvent && (
              <TouchableOpacity
                style={styles.btnDelete}
                onPress={handleDelete}
                disabled={isUploading}
              >
                <Text style={styles.btnDeleteText}>Delete event</Text>
                <Ionicons name="trash-outline" size={18} color={themeColors.destructive} />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select date</Text>
            <View style={styles.pickerWrap}>
              <View style={styles.pickerCol}>
                <Text style={styles.colName}>Year</Text>
                <FlatList
                  data={getDynamicYears()}
                  renderItem={({ item }) => renderPickerItem(item, selYear, (v) => { setSelYear(v); setSelDay(''); setSelMonth(''); })}
                  keyExtractor={i => i.id}
                />
              </View>
              <View style={styles.pickerCol}>
                <Text style={styles.colName}>Month</Text>
                <FlatList
                  data={getAvailableMonths(selYear)}
                  renderItem={({ item }) => renderPickerItem(item, selMonth, (v) => { setSelMonth(v); setSelDay(''); })}
                  keyExtractor={i => i.id}
                />
              </View>
              <View style={styles.pickerCol}>
                <Text style={styles.colName}>Day</Text>
                <FlatList
                  data={getDaysForMonth(selMonth, selYear)}
                  renderItem={({ item }) => renderPickerItem(item, selDay, setSelDay)}
                  keyExtractor={i => i.id}
                />
              </View>
            </View>
            <TouchableOpacity
              style={styles.btnModal}
              onPress={() => {
                const now = new Date();
                if (!selYear) setSelYear(now.getFullYear().toString());
                if (!selMonth) setSelMonth(now.getMonth().toString());
                if (!selDay) setSelDay(now.getDate().toString());
                setShowDatePicker(false);
              }}
            >
              <Text style={styles.btnModalText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Event time</Text>
            <View style={styles.pickerWrap}>
              <View style={styles.pickerCol}>
                <Text style={styles.colName}>Start hour.</Text>
                <FlatList
                  data={HOURS}
                  renderItem={({ item }) => renderPickerItem(item, startH, setStartH)}
                  keyExtractor={i => i}
                />
              </View>
              <View style={styles.pickerCol}>
                <Text style={styles.colName}>Min start.</Text>
                <FlatList
                  data={MINUTES}
                  renderItem={({ item }) => renderPickerItem(item, startM, setStartM)}
                  keyExtractor={i => i}
                />
              </View>
              <View style={{ width: 15 }} />
              <View style={styles.pickerCol}>
                <Text style={styles.colName}>It's time to finish.</Text>
                <FlatList
                  data={HOURS}
                  renderItem={({ item }) => renderPickerItem(item, endH, setEndH)}
                  keyExtractor={i => i}
                />
              </View>
              <View style={styles.pickerCol}>
                <Text style={styles.colName}>Min con.</Text>
                <FlatList
                  data={MINUTES}
                  renderItem={({ item }) => renderPickerItem(item, endM, setEndM)}
                  keyExtractor={i => i}
                />
              </View>
            </View>
            <TouchableOpacity
              style={styles.btnModal}
              onPress={() => {
                if (!startH) setStartH('19');
                if (!startM) setStartM('00');
                if (!endH) setEndH('21');
                if (!endM) setEndM('00');
                setShowTimePicker(false);
              }}
            >
              <Text style={styles.btnModalText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: tc.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: tc.foreground,
  },
  progressBar: {
    width: 80,
    height: 3,
    backgroundColor: tc.secondary,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: tc.primary },
  container: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 60 },
  stepIndicator: {
    fontSize: typography.xs,
    fontWeight: '800',
    color: tc.primary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  formSection: { gap: 14 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: tc.foreground,
    marginBottom: 2,
  },
  input: {
    backgroundColor: tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.base,
    color: tc.foreground,
  },
  textArea: { height: 100 },
  imageUploadContainer: {
    width: '100%',
    height: 180,
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: tc.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageUploaded: {
    borderStyle: 'solid',
    borderColor: tc.primary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  placeholderText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: tc.foreground,
    marginTop: 8,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 11,
    color: tc.mutedForeground,
    marginTop: 4,
  },
  changeImageBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  changeImageText: {
    color: colors.white,
    fontSize: typography.sm,
    fontWeight: '600',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 10,
  },
  selectorText: { fontSize: typography.base, color: tc.foreground, fontWeight: '500' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catScroll: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  chipGridHorizontal: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: tc.border,
    backgroundColor: tc.card,
  },
  chipActive: {
    backgroundColor: tc.primary,
    borderColor: tc.primary,
  },
  chipText: { fontSize: 11, color: tc.foreground, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  vibeCard: {
    width: '31%',
    backgroundColor: tc.card,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: borderRadius.lg,
    padding: 10,
    alignItems: 'center',
    gap: spacing.xs,
  },
  vibeCardActive: {
    borderColor: tc.primary,
    backgroundColor: `${tc.primary}08`,
  },
  vibeLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: tc.mutedForeground,
    textAlign: 'center',
  },
  vibeLabelActive: { color: tc.primary },
  inputRow: { flexDirection: 'row', gap: 10 },
  footerActions: { marginTop: 32, gap: spacing.md },
  btnMain: {
    backgroundColor: tc.foreground,
    padding: 14,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  btnFinish: { backgroundColor: tc.primary },
  btnMainText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  btnDelete: {
    backgroundColor: 'transparent',
    padding: 14,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: tc.destructive,
  },
  btnDeleteText: { color: tc.destructive, fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: tc.background,
    borderRadius: borderRadius.xl,
    padding: 20,
    maxHeight: 420,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontWeight: '800',
    color: tc.foreground,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerWrap: { flexDirection: 'row', height: 250 },
  pickerCol: { flex: 1 },
  colName: {
    textAlign: 'center',
    fontSize: 9,
    color: tc.mutedForeground,
    marginBottom: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pickerOpt: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginHorizontal: 2,
  },
  pickerOptActive: { backgroundColor: tc.primary },
  pickerOptText: { fontSize: typography.base, color: tc.foreground },
  pickerOptTextActive: { color: colors.white, fontWeight: '700' },
  btnModal: {
    backgroundColor: tc.primary,
    padding: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: 12,
  },
  btnModalText: { color: colors.white, fontWeight: '700', fontSize: typography.base },
});   