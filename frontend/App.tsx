import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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

// Combined Toast System
import { ToastProvider } from './app/components/ToastProvider';

// Stores
import { useUserStore } from './app/store/userStore';
import { useEventStore } from './app/store/eventStore';
import { useDiscussionStore } from './app/store/discussionStore';

// Icons component
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Кастомный BottomTabBar с правильной обработкой доступности
function CustomTabBar(props: any) {
  return (
    <View importantForAccessibility="yes" accessibilityElementsHidden={false}>
      <BottomTabBar {...props} />
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'CommunicationHub') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#eee',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Главная' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Поиск' }} />
      <Tab.Screen
        name="CommunicationHub"
        component={CommunicationHubScreen}
        options={{ title: 'Общение' }}
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
    </Stack.Navigator>
  );
}

function ProfileScreenWrapper() {
  const { user } = useUserStore();
  if (user.userType === 'organizer') {
    return <OrganizerProfileScreen />;
  }
  return <ProfileScreen />;
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useUserStore();
  const fetchEvents = useEventStore(state => state.fetchEvents);
  const fetchPosts = useDiscussionStore(state => state.fetchPosts);
  const fetchMyTickets = useUserStore(state => state.fetchMyTickets);

  useEffect(() => {
    if (isAuthenticated) {
      const loadInitialData = async () => {
        try {
          await Promise.all([fetchEvents(), fetchPosts(), fetchMyTickets()]);
        } catch (e) {
          // initial load error
        }
      };
      loadInitialData();
    }
  }, [isAuthenticated]);

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: '#fff',
      }}
    >
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={TabNavigator} />
              <Stack.Screen name="EventDetail" component={EventDetailScreen} />
              <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
              <Stack.Screen name="OrganizerProfile" component={OrganizerProfileScreen} />
              <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
              <Stack.Screen name="PostThread" component={PostThreadScreen} />
              <Stack.Screen name="CreateDiscussion" component={CreateDiscussionScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="FriendProfile" component={FriendProfileScreen} />
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
