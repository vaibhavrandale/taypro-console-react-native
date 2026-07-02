import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
};

export function Input({
  label,
  error,
  leftIcon,
  isPassword = false,
  inputRef,
  style,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.inputBackground,
            borderColor: error
              ? colors.danger
              : focused
                ? colors.primary
                : colors.inputBorder,
          },
          focused && !error && styles.inputFocused,
        ]}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={15}
            color={focused ? colors.primary : colors.textMuted}
            style={styles.leftIcon}
          />
        ) : null}
        <TextInput
          ref={inputRef}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: colors.textPrimary }, style]}
          {...rest}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={15}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 38,
  },
  inputFocused: {
    borderWidth: 1.5,
  },
  leftIcon: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.bodySmall,
    paddingVertical: spacing.sm,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
