import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';

type Props = {
  onPress: () => void;
  loading?: boolean;
};

export function MapLocateButton({ onPress, loading = false }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
          opacity: pressed || loading ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Locate me"
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name="locate" size={20} color={colors.primary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 2,
  },
});
