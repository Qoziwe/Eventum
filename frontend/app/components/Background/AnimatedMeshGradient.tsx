import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Rect, SweepGradient, vec, Group, BlurMask } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { useThemeStore } from '../../store/themeStore';

export default function AnimatedMeshGradient() {
    const { width, height } = useWindowDimensions();
    const rotation = useSharedValue(0);
    const isDark = useThemeStore((s) => s.isDark);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(Math.PI * 2, { duration: 25000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const center = vec(width / 2, height / 2);

    const transform = useDerivedValue(() => {
        return [{ rotate: rotation.value }];
    });

    const meshColors = isDark
        ? [
            '#4C1D95', // Deep purple
            '#1E3A8A', // Deep blue
            '#0F766E', // Deep teal
            '#831843', // Deep pink
            '#4C1D95',
        ]
        : [
            colors.liquid.mesh1,
            colors.liquid.mesh2,
            colors.liquid.mesh3,
            colors.liquid.mesh4,
            colors.liquid.mesh1,
        ];

    return (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Rect x={0} y={0} width={width} height={height} color={isDark ? "#0A0A0A" : "#FFFFFF"} />
            <Group origin={center} transform={transform}>
                <Rect x={-width} y={-height} width={width * 3} height={height * 3}>
                    <SweepGradient
                        c={center}
                        colors={meshColors}
                    />
                    <BlurMask blur={80} style="normal" />
                </Rect>
            </Group>
        </Canvas>
    );
}
