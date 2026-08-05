import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [open]);

  const openSheet = () => {
    Keyboard.dismiss();
    setOpen(true);
  };

  const bottomPad =
    keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, spacing.sm);
  const sheetMaxHeight = Math.min(
    windowHeight * 0.55,
    Math.max(200, windowHeight - bottomPad - insets.top - spacing.lg),
  );

  return (
    <>
      <Pressable
        onPress={openSheet}
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
                maxHeight: sheetMaxHeight,
                marginBottom: keyboardHeight > 0 ? keyboardHeight : 0,
                paddingBottom: Math.max(insets.bottom, spacing.lg),
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
              keyboardShouldPersistTaps="handled"
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
