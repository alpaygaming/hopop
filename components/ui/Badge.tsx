import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', icon, style }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success': return { bg: colors.accent.green, text: colors.background };
      case 'warning': return { bg: colors.accent.orange, text: colors.background };
      case 'error': return { bg: colors.accent.red, text: colors.background };
      case 'info': return { bg: colors.accent.blue, text: colors.background };
      default: return { bg: colors.primary, text: colors.background };
    }
  };

  const { bg, text } = getVariantStyles();

  return (
    <View style={[styles.container, { backgroundColor: bg }, style]}>
      {icon && <Ionicons name={icon} size={12} color={text} style={styles.icon} />}
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontWeight: 'bold',
  },
});
