import React, { useState } from 'react';
import { StyleSheet, StyleProp, ViewStyle, Pressable, LayoutChangeEvent, View } from 'react-native';
import {
    Canvas,
    RoundedRect,
    Group,
    LinearGradient,
    vec,
    Shadow,
    BackdropBlur,
    rect,
    rrect,
} from '@shopify/react-native-skia';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { useThemeStore } from '../../store/themeStore';

interface LiquidGlassDropProps {
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    borderRadius?: number;
    onPress?: () => void;
    intensity?: 'light' | 'heavy';
    contentPadding?: number;
}

export default function LiquidGlassDrop({
    children,
    style,
    borderRadius = 24,
    onPress,
    intensity = 'heavy',
    contentPadding = 16,
}: LiquidGlassDropProps) {
    const isDark = useThemeStore((s) => s.isDark);
    const isPressed = useSharedValue(false);
    const [size, setSize] = useState({ width: 0, height: 0 });

    const containerStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scaleX: withSpring(isPressed.value ? 0.96 : 1, { damping: 15, stiffness: 200 }) },
                { scaleY: withSpring(isPressed.value ? 0.96 : 1, { damping: 15, stiffness: 200 }) },
            ],
        };
    });

    const onLayout = (e: LayoutChangeEvent) => {
        setSize({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
        });
    };

    const hasSize = size.width > 0 && size.height > 0;
    const clipRRect = hasSize ? rrect(rect(0, 0, size.width, size.height), borderRadius, borderRadius) : undefined;

    const blurAmount = intensity === 'heavy' ? 25 : 12;
    // Base transparent fill using very low opacity for pure glass effect
    const glassFill = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.15)';
    const rimLight1 = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.9)';
    const rimLight2 = 'rgba(255, 255, 255, 0.0)';
    const rimLight3 = isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.1)';

    return (
        <Pressable
            style={style}
            onPressIn={() => (isPressed.value = true)}
            onPressOut={() => (isPressed.value = false)}
            onPress={onPress}
            onLayout={onLayout}
        >
            <Animated.View style={[styles.innerContainer, containerStyle]}>
                {hasSize && (
                    <Canvas style={StyleSheet.absoluteFill}>
                        {/* 1. Backdrop Blur - Refraction exactly underneath the component */}
                        <Group clip={clipRRect!}>
                            <BackdropBlur blur={blurAmount} clip={clipRRect!} />

                            {/* Base slight tint for realism */}
                            <RoundedRect x={0} y={0} width={size.width} height={size.height} r={borderRadius} color={glassFill} />

                            {/* 2. Advanced Convex Volume with 3D Inner Shadows */}
                            <RoundedRect x={0} y={0} width={size.width} height={size.height} r={borderRadius} color="transparent">
                                {/* Top-Left Bright Specular Highlights */}
                                <Shadow inner dx={1.5} dy={1.5} blur={4} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.8)"} />
                                {/* Soft inner glow expanding the refraction */}
                                <Shadow inner dx={-8} dy={-8} blur={20} color={isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.2)"} />
                                {/* Bottom-Right Dark Reflection to make it pop like a water drop */}
                                <Shadow inner dx={-2} dy={-2} blur={6} color={isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.15)"} />
                            </RoundedRect>
                        </Group>

                        {/* 3. Rim Light / Sharp Refraction Stroke using LinearGradient */}
                        <RoundedRect x={0} y={0} width={size.width} height={size.height} r={borderRadius} color="transparent" style="stroke" strokeWidth={1.5}>
                            <LinearGradient
                                start={vec(0, 0)}
                                end={vec(size.width, size.height)}
                                colors={[rimLight1, rimLight2, rimLight3]}
                            />
                        </RoundedRect>

                        {/* Drop shadow on the background outside the component */}
                        <RoundedRect x={0} y={0} width={size.width} height={size.height} r={borderRadius} color="transparent">
                            <Shadow dx={0} dy={8} blur={20} color={isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.1)"} />
                        </RoundedRect>
                    </Canvas>
                )}

                <View style={{ padding: contentPadding, borderRadius, overflow: 'hidden', flex: 1, zIndex: 2 }}>
                    {children}
                </View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    innerContainer: {
        flex: 1,
        overflow: 'visible',
    },
});
