import React, { useCallback, useEffect, useState } from 'react';
import { appAlert } from '../utils/appAlert';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Navbar } from '../components/layout';
import { Badge, Button } from '../components/ui';
import { fetchTimerById, updateTimer } from '../api/timers';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { DISABLED_TIMER, type UpdateTimerPayload } from '../types/timers';
import { formatApiDateLabel, toApiDateString } from '../utils/datetime';
import type { TimersStackParamList } from '../navigation/TimersStack';

type Navigation = NativeStackNavigationProp<TimersStackParamList, 'UpdateTimer'>;
type Route = RouteProp<TimersStackParamList, 'UpdateTimer'>;

type PickerTarget =
  | 'timer1'
  | 'timer2'
  | 'timer3'
  | 'timer1_date'
  | 'timer2_date'
  | 'timer3_date'
  | null;

const TIME_EXAMPLES = [
  { value: '06:30:00', label: '6:30:00 AM' },
  { value: '14:00:00', label: '2:00:00 PM' },
  { value: '18:45:00', label: '6:45:00 PM' },
];

function parseTimeToDate(value: string): Date {
  const date = new Date();
  if (!value || value === DISABLED_TIMER) {
    date.setHours(0, 0, 0, 0);
    return date;
  }
  const [h = '0', m = '0', s = '0'] = value.split(':');
  date.setHours(Number(h) || 0, Number(m) || 0, Number(s) || 0, 0);
  return date;
}

function formatTimeValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function displayTime(value: string): string {
  if (!value || value === DISABLED_TIMER) return 'Disabled';
  const date = parseTimeToDate(value);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function parseDateValue(value: string): Date {
  if (!value) return new Date();
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function UpdateTimerScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { timerId } = route.params;

  const [form, setForm] = useState<UpdateTimerPayload>({
    site_id: '',
    block: '',
    timer1: DISABLED_TIMER,
    timer1_date: '',
    timer2: DISABLED_TIMER,
    timer2_date: '',
    timer3: DISABLED_TIMER,
    timer3_date: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(true);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  const loadTimer = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTimerById(timerId);
      setForm({
        site_id: data.site_id || '',
        block: data.block || '',
        timer1: data.timer1 || DISABLED_TIMER,
        timer1_date: data.timer1_date || '',
        timer2: data.timer2 || DISABLED_TIMER,
        timer2_date: data.timer2_date || '',
        timer3: data.timer3 || DISABLED_TIMER,
        timer3_date: data.timer3_date || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timer');
    } finally {
      setLoading(false);
    }
  }, [timerId]);

  useEffect(() => {
    void loadTimer();
  }, [loadTimer]);

  const openTimePicker = (key: 'timer1' | 'timer2' | 'timer3') => {
    if (form[key] === DISABLED_TIMER) return;
    setPickerDate(parseTimeToDate(form[key]));
    setPickerTarget(key);
  };

  const openDatePicker = (
    key: 'timer1_date' | 'timer2_date' | 'timer3_date',
  ) => {
    setPickerDate(parseDateValue(form[key]));
    setPickerTarget(key);
  };

  const onPickerChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') {
      setPickerTarget(null);
    }

    if (event.type === 'dismissed') {
      setPickerTarget(null);
      return;
    }

    if (!picked || !pickerTarget) return;

    if (
      pickerTarget === 'timer1' ||
      pickerTarget === 'timer2' ||
      pickerTarget === 'timer3'
    ) {
      setForm((prev) => ({
        ...prev,
        [pickerTarget]: formatTimeValue(picked),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [pickerTarget]: toApiDateString(picked),
      }));
    }

    if (Platform.OS === 'ios') {
      setPickerDate(picked);
    }
  };

  const toggleDisable = (key: 'timer1' | 'timer2' | 'timer3') => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key] === DISABLED_TIMER ? '00:00:00' : DISABLED_TIMER,
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await updateTimer(timerId, form);
      appAlert('Success', 'Timer updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      appAlert(
        'Update failed',
        err instanceof Error ? err.message : 'Failed to update timer',
      );
    } finally {
      setSaving(false);
    }
  };

  const renderTimerSlot = (
    timeKey: 'timer1' | 'timer2' | 'timer3',
    dateKey: 'timer1_date' | 'timer2_date' | 'timer3_date',
    label: string,
  ) => {
    const disabled = form[timeKey] === DISABLED_TIMER;

    return (
      <View
        style={[
          styles.slotCard,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.slotTitle, { color: colors.primary }]}>
          {label}
        </Text>

        <Pressable
          onPress={() => openTimePicker(timeKey)}
          disabled={disabled}
          style={[
            styles.field,
            {
              backgroundColor: colors.backgroundTertiary,
              borderColor: colors.border,
              opacity: disabled ? 0.55 : 1,
            },
          ]}
        >
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            Time
          </Text>
          <View style={styles.fieldValueRow}>
            <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
              {displayTime(form[timeKey])}
            </Text>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => openDatePicker(dateKey)}
          style={[
            styles.field,
            {
              backgroundColor: colors.backgroundTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            Date
          </Text>
          <View style={styles.fieldValueRow}>
            <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
              {form[dateKey]
                ? formatApiDateLabel(form[dateKey])
                : 'Select date'}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={colors.textMuted}
            />
          </View>
        </Pressable>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.textSecondary }]}>
            Disable Timer
          </Text>
          <Switch
            value={disabled}
            onValueChange={() => toggleDisable(timeKey)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    );
  };

  const isTimePicker =
    pickerTarget === 'timer1' ||
    pickerTarget === 'timer2' ||
    pickerTarget === 'timer3';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Navbar
        title="Update Timer"
        subtitle={
          form.site_id && form.block
            ? `${form.site_id} · ${form.block}`
            : undefined
        }
        showMenu={false}
        leftAction={
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={6}
            style={[
              styles.backBtn,
              { backgroundColor: colors.backgroundTertiary },
            ]}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
          </Pressable>
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
          <Button title="Retry" size="sm" onPress={() => void loadTimer()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <Badge
              label={`${form.site_id} : ${form.block}`}
              variant="warning"
            />
            <Pressable
              onPress={() => setShowHelp(true)}
              style={[
                styles.helpBtn,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={colors.primary}
              />
            </Pressable>
          </View>

          {renderTimerSlot('timer1', 'timer1_date', 'Timer 1')}
          {renderTimerSlot('timer2', 'timer2_date', 'Timer 2')}
          {renderTimerSlot('timer3', 'timer3_date', 'Timer 3')}

          <Button
            title={saving ? 'Updating...' : 'Update'}
            onPress={handleSubmit}
            loading={saving}
            fullWidth
          />
        </ScrollView>
      )}

      {pickerTarget && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerDate}
          mode={isTimePicker ? 'time' : 'date'}
          display="default"
          onChange={onPickerChange}
          is24Hour={false}
        />
      ) : null}

      <Modal
        visible={pickerTarget != null && Platform.OS === 'ios'}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerTarget(null)}
      >
        <View style={styles.pickerOverlay}>
          <Pressable
            style={styles.pickerBackdrop}
            onPress={() => setPickerTarget(null)}
          />
          <View
            style={[
              styles.pickerSheet,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
                {isTimePicker ? 'Select time' : 'Select date'}
              </Text>
              <Pressable onPress={() => setPickerTarget(null)}>
                <Text style={{ color: colors.primary, ...typography.label }}>
                  Done
                </Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={pickerDate}
              mode={isTimePicker ? 'time' : 'date'}
              display="spinner"
              onChange={onPickerChange}
              themeVariant={isDark ? 'dark' : 'light'}
              is24Hour={false}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHelp}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHelp(false)}
      >
        <View style={styles.helpOverlay}>
          <View
            style={[
              styles.helpCard,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.helpHeader}>
              <View style={styles.helpTitleRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>
                  Timer Execution Instructions
                </Text>
              </View>
              <Pressable onPress={() => setShowHelp(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.helpScroll}
              contentContainerStyle={styles.helpScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.helpWarning,
                  { backgroundColor: colors.badge.warning.bg },
                ]}
              >
                <Text
                  style={[
                    styles.helpWarningText,
                    { color: colors.badge.warning.text },
                  ]}
                >
                  Incorrect date or time configuration may cause the timer to
                  execute immediately or at an unexpected time.
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text
                  style={[
                    styles.helpSectionTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Setting Timer for Today
                </Text>
                <Text style={[styles.helpLine, { color: colors.textSecondary }]}>
                  If you want to execute Timer 1 today:
                </Text>
                <Text
                  style={[styles.helpBullet, { color: colors.textSecondary }]}
                >
                  • timer1_date must be set to Yesterday
                </Text>
                <Text
                  style={[styles.helpBullet, { color: colors.textSecondary }]}
                >
                  • timer1 time should be set to the desired execution time for
                  today
                </Text>
                <Text
                  style={[styles.helpBullet, { color: colors.textSecondary }]}
                >
                  • On mobile, use 12-hour format and set AM/PM correctly
                </Text>
                <Text
                  style={[styles.helpBullet, { color: colors.textSecondary }]}
                >
                  • Laptop / UserBasedLinkDashboard uses 24-hour format (HH:mm)
                </Text>
                <Text
                  style={[
                    styles.helpCaution,
                    { color: colors.badge.error.text },
                  ]}
                >
                  If the date is not set correctly, the timer will execute
                  immediately or within the next minute.
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text
                  style={[
                    styles.helpSectionTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Setting Timer for Tomorrow
                </Text>
                <Text style={[styles.helpLine, { color: colors.textSecondary }]}>
                  If you want to execute Timer 1 tomorrow:
                </Text>
                <Text
                  style={[styles.helpBullet, { color: colors.textSecondary }]}
                >
                  • timer1_date must be set to Today
                </Text>
                <Text
                  style={[styles.helpBullet, { color: colors.textSecondary }]}
                >
                  • timer1 time should be the desired execution time for tomorrow
                </Text>
                <Text
                  style={[styles.helpBullet, { color: colors.textSecondary }]}
                >
                  • On mobile, use 12-hour format and set AM/PM correctly
                </Text>
                <Text
                  style={[styles.helpBullet, { color: colors.textSecondary }]}
                >
                  • Laptop uses 24-hour format (HH:mm)
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text
                  style={[
                    styles.helpSectionTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Time Format Examples
                </Text>
                {TIME_EXAMPLES.map((example) => (
                  <View key={example.value} style={styles.helpExampleRow}>
                    <Text
                      style={[
                        styles.helpExampleValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {example.value}
                    </Text>
                    <Text
                      style={[
                        styles.helpExampleLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      → {example.label}
                    </Text>
                  </View>
                ))}
              </View>

              <View
                style={[
                  styles.helpVerify,
                  { backgroundColor: colors.badge.success.bg },
                ]}
              >
                <Text
                  style={[
                    styles.helpVerifyText,
                    { color: colors.badge.success.text },
                  ]}
                >
                  Always verify date and time before saving timers to avoid
                  accidental execution.
                </Text>
              </View>
            </ScrollView>

            <Button
              title="Got it"
              size="sm"
              onPress={() => setShowHelp(false)}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  helpBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  slotTitle: {
    ...typography.label,
    fontSize: 14,
  },
  field: {
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
  },
  fieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  fieldValue: {
    ...typography.label,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  switchLabel: {
    ...typography.bodySmall,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pickerSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    paddingBottom: spacing.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pickerTitle: {
    ...typography.label,
    fontSize: 15,
  },
  helpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  helpCard: {
    width: '100%',
    maxHeight: '88%',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  helpTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  helpTitle: {
    ...typography.label,
    fontSize: 15,
    flexShrink: 1,
  },
  helpScroll: {
    flexGrow: 0,
  },
  helpScrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  helpWarning: {
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  helpWarningText: {
    ...typography.bodySmall,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  helpSection: {
    gap: 6,
  },
  helpSectionTitle: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '700',
  },
  helpLine: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  helpBullet: {
    ...typography.bodySmall,
    lineHeight: 18,
    paddingLeft: 2,
  },
  helpCaution: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  helpExampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  helpExampleValue: {
    ...typography.label,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  helpExampleLabel: {
    ...typography.bodySmall,
  },
  helpVerify: {
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  helpVerifyText: {
    ...typography.bodySmall,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
});
