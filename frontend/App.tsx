import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Screens
import HomeScreen from './app/screens/HomeScreen';
import EventDetailScreen from './app/screens/EventDetailScreen';
import ProfileScreen from './app/screens/ProfileScreen';
import OrganizerProfileScreen from './app/screens/OrganizerProfileScreen';
import EditProfileScreen from './app/screens/EditProfileScreen';
import CreateEventScreen from './app/screens/CreateEventScreen';
import CommunicationHubScreen from './app/screens/CommunicationHubScreen';
import ChatScreen from './app/screens/ChatScreen';
import CommunitiesScreen from './app/screens/DiscussionsScreen';
import MyDiscussionsScreen from './app/screens/MyDiscussionsScreen';
import SearchScreen from './app/screens/SearchScreen';
import SettingsScreen from './app/screens/SettingsScreen';
import PostThreadScreen from './app/screens/PostThreadScreen';
import TicketDetailScreen from './app/screens/TicketDetailScreen';
import AuthScreen from './app/screens/AuthScreen';
import SavedEventsScreen from './app/screens/SavedEventsScreen';
import FollowedOrganizersScreen from './app/screens/FollowedOrganizersScreen';
import EditStudioScreen from './app/screens/EditStudioScreen';
import AnalyticsScreen from './app/screens/AnalyticsScreen';
import FinanceScreen from './app/screens/FinanceScreen';
import CreateDiscussionScreen from './app/screens/CreateDiscussionScreen';
import NotificationsScreen from './app/screens/NotificationsScreen';
import SubscriptionScreen from './app/screens/SubscriptionScreen';
import FriendProfileScreen from './app/screens/FriendProfileScreen';
import AdminDashboardScreen from './app/screens/AdminDashboardScreen';
import AdminEventsScreen from './app/screens/AdminEventsScreen';
import AdminPostsScreen from './app/screens/AdminPostsScreen';
import AdminUsersScreen from './app/screens/AdminUsersScreen';
import AdminProfileScreen from './app/screens/AdminProfileScreen';

// Combined Toast System
import { ToastProvider } from './app/components/ToastProvider';

// Stores
import { useUserStore } from './app/store/userStore';
import { useEventStore } from './app/store/eventStore';
import { useDiscussionStore } from './app/store/discussionStore';
import { useNotificationStore } from './app/store/notificationStore';
import { useThemeStore, useThemeColors } from './app/store/themeStore';
import SocketManager from './app/services/SocketManager';

// Icons component
import { Ionicons } from '@expo/vector-icons';
import LiquidTabBar from './app/components/LiquidUI/LiquidTabBar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const renderSharedScreens = () => (
  <>
    <Stack.Screen name="EventDetail" component={EventDetailScreen} />
    <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
    <Stack.Screen name="OrganizerProfile" component={OrganizerProfileScreen} />
    <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
    <Stack.Screen name="PostThread" component={PostThreadScreen} />
    <Stack.Screen name="CreateDiscussion" component={CreateDiscussionScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="FriendProfile" component={FriendProfileScreen} />
  </>
);

function HomeStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      {renderSharedScreens()}
    </Stack.Navigator>
  );
}

function SearchStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain" component={SearchScreen} />
      {renderSharedScreens()}
    </Stack.Navigator>
  );
}

function CommunicationStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommunicationMain" component={CommunicationHubScreen} />
      {renderSharedScreens()}
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.isDark);

  return (
    <Tab.Navigator
      tabBar={props => <LiquidTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{ title: 'Главная' }}
        listeners={({ navigation }) => ({
          tabPress: e => {
            navigation.navigate('Home', { screen: 'HomeMain' });
          },
        })}
      />
      <Tab.Screen
        name="Search"
        component={SearchStackScreen}
        options={{ title: 'Поиск' }}
        listeners={({ navigation }) => ({
          tabPress: e => {
            navigation.navigate('Search', { screen: 'SearchMain' });
          },
        })}
      />
      <Tab.Screen
        name="CommunicationHub"
        component={CommunicationStackScreen}
        options={{ title: 'Общение' }}
        listeners={({ navigation }) => ({
          tabPress: e => {
            navigation.navigate('CommunicationHub', { screen: 'CommunicationMain' });
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{ title: 'Профиль' }}
        listeners={({ navigation }) => ({
          tabPress: e => {
            navigation.navigate('Profile', { screen: 'ProfileMain' });
          },
        })}
      />
    </Tab.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreenWrapper} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="FollowedOrganizers" component={FollowedOrganizersScreen} />
      <Stack.Screen name="SavedEvents" component={SavedEventsScreen} />
      <Stack.Screen name="EditStudio" component={EditStudioScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Finance" component={FinanceScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="MyDiscussions" component={MyDiscussionsScreen} />

      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminEvents" component={AdminEventsScreen} />
      <Stack.Screen name="AdminPosts" component={AdminPostsScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />

      {renderSharedScreens()}
    </Stack.Navigator>
  );
}

function ProfileScreenWrapper() {
  const { user } = useUserStore();
  if (user.isAdmin || user.userType === 'admin') {
    return <AdminProfileScreen />;
  }
  if (user.userType === 'organizer') {
    return <OrganizerProfileScreen />;
  }
  return <ProfileScreen />;
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useUserStore();
  const fetchEvents = useEventStore(state => state.fetchEvents);
  const fetchPosts = useDiscussionStore(state => state.fetchPosts);
  const fetchMyTickets = useUserStore(state => state.fetchMyTickets);
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const loadInitialData = async () => {
        try {
          // Initialize single socket connection
          await SocketManager.connect();

          await Promise.all([fetchEvents(), fetchPosts(), fetchMyTickets()]);
        } catch (e) {
          console.error("Initial load error", e);
        }
      };
      loadInitialData();

      return () => {
        SocketManager.disconnect();
      };
    }
  }, [isAuthenticated, user?.id]);

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: themeColors.background, card: themeColors.card, text: themeColors.foreground, border: themeColors.border, primary: themeColors.primary } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: themeColors.background, card: themeColors.card, text: themeColors.foreground, border: themeColors.border, primary: themeColors.primary } };

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: themeColors.background,
      }}
    >
      <NavigationContainer theme={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={TabNavigator} />
              <Stack.Screen name="Chat" component={ChatScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </SafeAreaProvider>
  );
}
