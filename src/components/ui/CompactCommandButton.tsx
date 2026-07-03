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
  style,
}: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const accentColor = tone === 'danger' ? colors.danger : colors.primary;
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
          backgroundColor: colors.backgroundTertiary,
        },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={accentColor} />
      ) : (
        <>
          <Ionicons name={icon} size={isXs ? 12 : 15} color={accentColor} />
          <Text
            style={[
              styles.label,
              isXs && styles.labelXs,
              { color: accentColor },
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
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
    gap: 2,
  },
  baseXs: {
    minHeight: 32,
    paddingVertical: 4,
    gap: 1,
  },
  label: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
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
