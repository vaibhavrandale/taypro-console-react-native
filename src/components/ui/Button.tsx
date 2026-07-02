import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const ICON_SIZES: Record<ButtonSize, number> = { sm: 12, md: 14, lg: 16 };

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const textStyle: TextStyle = {
    ...styles.text,
    ...sizeTextStyles[size],
    ...(variant === 'primary' && { color: '#101936' }),
    ...(variant === 'outline' && { color: colors.primary }),
    ...(variant === 'ghost' && { color: colors.primary }),
    ...(variant === 'danger' && { color: '#FFFFFF' }),
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        fullWidth && styles.fullWidth,
        variant === 'primary' && { backgroundColor: colors.primary },
        variant === 'outline' && {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.primary,
        },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        variant === 'danger' && { backgroundColor: colors.danger },
        isDisabled && { opacity: 0.55 },
        style,
        pressed && !isDisabled && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#101936' : colors.primary}
        />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={ICON_SIZES[size]}
              color={
                variant === 'primary'
                  ? '#101936'
                  : variant === 'danger'
                    ? '#FFFFFF'
                    : colors.primary
              }
              style={styles.icon}
            />
          ) : null}
          <Text style={textStyle}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { paddingVertical: 7, paddingHorizontal: spacing.md },
  md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
};

const sizeTextStyles: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: 12, fontWeight: '600' },
  md: typography.label,
  lg: { fontSize: 14, fontWeight: '600' },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    fontWeight: '600',
  },
});
