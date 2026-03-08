import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle;
}

export default function Avatar({ uri, name, size = 40, style }: AvatarProps) {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const fontSize = size * 0.4;
  const iconSize = size * 0.5;

  const renderContent = () => {
    if (uri) {
      return (
        <Image 
          source={{ uri }} 
          style={{ width: size, height: size, borderRadius: size / 2 }} 
          resizeMode="cover"
        />
      );
    }

    if (name) {
      const initials = name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      // Simple consistent color generation based on name length
      const bgColors = [
        themeColors.primary,
        themeColors.secondary, 
        themeColors.accent,
        colors.success, // Emerald
        '#F59E0B', // Amber
        '#8B5CF6', // Violet
        '#EC4899', // Pink
      ];
      const colorIndex = name.length % bgColors.length;
      const backgroundColor = bgColors[colorIndex];
      const textColor = backgroundColor === themeColors.secondary ? themeColors.foreground : '#FFFFFF';

      return (
        <View style={[
          styles.initialsContainer, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            backgroundColor 
          }
        ]}>
          <Text style={[styles.initialsText, { fontSize, color: textColor }]}>
            {initials}
          </Text>
        </View>
      );
    }

    return (
      <View style={[
        styles.defaultContainer, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2 
        }
      ]}>
        <Ionicons name="person" size={iconSize} color={themeColors.mutedForeground} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {renderContent()}
    </View>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontWeight: '600',
  },
  defaultContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tc.muted,
    borderWidth: 1,
    borderColor: tc.border,
  },
});
