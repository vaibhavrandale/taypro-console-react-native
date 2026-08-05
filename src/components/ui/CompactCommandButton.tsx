import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  size?: 'sm' | 'xs';
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function CompactCommandButton({
  label,
  icon,
  onPress,
  loading = false,
  disabled = false,
  tone = 'default',
  size = 'sm',
  filled = false,
  style,
}: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const accentColor = tone === 'danger' ? colors.danger : colors.primary;
  const contentColor = filled ? '#FFFFFF' : accentColor;
  const isXs = size === 'xs';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isXs && styles.baseXs,
        {
          borderColor: accentColor,
          backgroundColor: filled ? accentColor : colors.backgroundTertiary,
        },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={contentColor} />
      ) : (
        <>
          <Ionicons name={icon} size={isXs ? 11 : 13} color={contentColor} />
          <Text
            style={[
              styles.label,
              isXs && styles.labelXs,
              { color: contentColor },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    minHeight: 28,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    gap: 2,
  },
  baseXs: {
    minHeight: 22,
    paddingVertical: 1,
    paddingHorizontal: 4,
    gap: 2,
  },
  label: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.15,
    textTransform: 'uppercase',
  },
  labelXs: {
    fontSize: 8,
    letterSpacing: 0.1,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
});
