import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, Animated, PanResponder } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useThemeColors, useThemeStore } from '../../store/themeStore';
import { spacing } from '../../theme/colors';

export default function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const themeColors = useThemeColors();
    const { width } = useWindowDimensions();
    const isDark = useThemeStore((s) => s.isDark);

    const TAB_BAR_MARGIN = spacing.lg * 2;
    const TAB_BAR_WIDTH_OUTER = width - TAB_BAR_MARGIN;
    const TAB_BAR_WIDTH_INNER = TAB_BAR_WIDTH_OUTER - 2; // Account for 1px border left/right
    const TAB_HEIGHT = 64;
    const TAB_WIDTH = TAB_BAR_WIDTH_INNER / state.routes.length;

    // The physical sliding circle
    const translateX = useRef(new Animated.Value(state.index * TAB_WIDTH)).current;

    // Accurate tracking of native animation state to prevent draggable jumping
    const currentTranslateX = useRef(state.index * TAB_WIDTH);

    useEffect(() => {
        const id = translateX.addListener(({ value }) => {
            currentTranslateX.current = value;
        });
        return () => {
            translateX.removeListener(id);
        };
    }, [translateX]);

    // Keep fresh refs for the PanResponder to avoid stale closures
    const stateRef = useRef({ state, navigation, TAB_WIDTH, TAB_BAR_WIDTH_INNER });
    useEffect(() => {
        stateRef.current = { state, navigation, TAB_WIDTH, TAB_BAR_WIDTH_INNER };
    }, [state, navigation, TAB_WIDTH, TAB_BAR_WIDTH_INNER]);

    // React to external tab changes (e.g. back button or router updates)
    useEffect(() => {
        Animated.spring(translateX, {
            toValue: state.index * TAB_WIDTH,
            damping: 18,
            stiffness: 140,
            mass: 0.8,
            useNativeDriver: true,
        }).start();
    }, [state.index, TAB_WIDTH, translateX]);

    // Pan Responder for Dragging the Indicator
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true, // Take all touches instantly!
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt, gestureState) => {
                const { TAB_WIDTH, TAB_BAR_WIDTH_INNER } = stateRef.current;

                // Stop any ongoing spring animation so we can instantly move it
                translateX.stopAnimation();

                // Calculate position relative to tab bar (spacing.lg is the left offset)
                const localX = gestureState.x0 - spacing.lg;

                // Center the indicator on the finger instantly
                let newTarget = localX - (TAB_WIDTH / 2);
                newTarget = Math.max(0, Math.min(newTarget, TAB_BAR_WIDTH_INNER - TAB_WIDTH));

                // Update physical position immediately
                translateX.setValue(newTarget);
            },
            onPanResponderMove: (evt, gestureState) => {
                const { TAB_WIDTH, TAB_BAR_WIDTH_INNER } = stateRef.current;

                const localX = gestureState.moveX - spacing.lg;
                let newTarget = localX - (TAB_WIDTH / 2);
                newTarget = Math.max(0, Math.min(newTarget, TAB_BAR_WIDTH_INNER - TAB_WIDTH));

                // Update physical position immediately
                translateX.setValue(newTarget);
            },
            onPanResponderRelease: () => {
                const { state: ls, navigation: nav, TAB_WIDTH: tw } = stateRef.current;

                // Check exact current position
                const currentTargetValue = currentTranslateX.current;
                let closestTabIndex = Math.round(currentTargetValue / tw);
                closestTabIndex = Math.max(0, Math.min(closestTabIndex, ls.routes.length - 1));

                const route = ls.routes[closestTabIndex];
                const isFocused = ls.index === closestTabIndex;

                if (!isFocused) {
                    const event = nav.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!event.defaultPrevented) {
                        nav.navigate(route.name);
                    }
                } else {
                    // Snap to the closest tab if we didn't change pages
                    Animated.spring(translateX, {
                        toValue: closestTabIndex * tw,
                        damping: 18,
                        stiffness: 140,
                        mass: 0.8,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    return (
        <BlurView
            intensity={Platform.OS === 'android' ? 100 : 80}
            tint={isDark ? "dark" : "light"}
            style={[styles.container, {
                backgroundColor: isDark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.5)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1,
                shadowColor: isDark ? '#000' : '#888',
            }]}
        >
            {/* Sliding Indicator Background */}
            <Animated.View
                style={[styles.indicatorWrapper, { transform: [{ translateX }], width: TAB_WIDTH }]}
            >
                <View style={[styles.indicator, {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.1)'
                }]} />
            </Animated.View>

            {/* Tab Items */}
            <Animated.View style={styles.content} {...panResponder.panHandlers}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({ type: 'tabLongPress', target: route.key });
                    };

                    let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';
                    if (route.name === 'Home') iconName = isFocused ? 'home' : 'home-outline';
                    else if (route.name === 'Search') iconName = isFocused ? 'search' : 'search-outline';
                    else if (route.name === 'CommunicationHub') iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline';
                    else if (route.name === 'Profile') iconName = isFocused ? 'person' : 'person-outline';

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={(options as any)?.tabBarTestID}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={styles.tabItem}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={iconName}
                                size={26}
                                color={isFocused ? themeColors.foreground : themeColors.mutedForeground}
                            />
                        </TouchableOpacity>
                    );
                })}
            </Animated.View>
        </BlurView>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
        left: spacing.lg,
        right: spacing.lg,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
            web: {
                boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(20px)',
            }
        }),
    },
    indicatorWrapper: {
        position: 'absolute',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    indicator: {
        width: 60,
        height: 44,
        borderRadius: 22,
    },
    content: {
        flexDirection: 'row',
        height: '100%',
        alignItems: 'center',
        zIndex: 2,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
});
