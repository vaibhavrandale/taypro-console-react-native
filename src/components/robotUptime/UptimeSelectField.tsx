import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export type UptimeSelectOption = {
  value: string | number;
  label: string;
  disabled?: boolean;
};

type Props = {
  label: string;
  value: string | number;
  options: UptimeSelectOption[];
  onChange: (value: string | number) => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function UptimeSelectField({
  label,
  value,
  options,
  onChange,
  icon = 'chevron-down-outline',
}: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
        <View style={styles.fieldValueRow}>
          <Text
            style={[styles.fieldValue, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {selected?.label ?? 'Select'}
          </Text>
          <Ionicons name={icon} size={16} color={colors.textMuted} />
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                {label}
              </Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={[styles.sheetDone, { color: colors.primary }]}>
                  Done
                </Text>
              </Pressable>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              style={styles.list}
              renderItem={({ item }) => {
                const active = item.value === value;
                const disabled = item.disabled;

                return (
                  <Pressable
                    disabled={disabled}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor: active
                          ? colors.backgroundTertiary
                          : 'transparent',
                        opacity: disabled ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: active ? colors.primary : colors.textPrimary,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {active ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  fieldLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '700',
  },
  fieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  fieldValue: {
    ...typography.label,
    fontSize: 13,
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    maxHeight: '55%',
    borderTopWidth: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sheetTitle: {
    ...typography.label,
    fontSize: 15,
  },
  sheetDone: {
    ...typography.label,
    fontSize: 15,
  },
  list: {
    paddingBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionText: {
    ...typography.bodySmall,
    fontSize: 14,
  },
});
