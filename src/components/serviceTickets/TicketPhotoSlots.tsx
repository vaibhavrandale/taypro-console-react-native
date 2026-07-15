import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = {
  title: string;
  images: Array<string | undefined>;
  onCapture: (index: number) => void;
  onRemove: (index: number) => void;
};

export function TicketPhotoSlots({
  title,
  images,
  onCapture,
  onRemove,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <View style={styles.grid}>
        {images.map((uri, index) => (
          <Pressable
            key={`photo-${index}`}
            onPress={() => onCapture(index)}
            style={[
              styles.slot,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            {uri ? (
              <>
                <Image source={{ uri }} style={styles.image} />
                <Pressable
                  onPress={() => onRemove(index)}
                  style={[styles.removeBtn, { backgroundColor: colors.danger }]}
                  hitSlop={6}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </>
            ) : (
              <View style={styles.empty}>
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Photo {index + 1}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.label,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slot: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    aspectRatio: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyText: {
    ...typography.caption,
    fontSize: 10,
  },
});
