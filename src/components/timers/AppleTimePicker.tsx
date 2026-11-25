import React, { useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fontFamily } from '../../theme/fonts';
import { radius, spacing } from '../../theme/spacing';
import type { ThemeColors } from '../../theme/colors';

const ITEM_H = 44;
const VISIBLE = 5;
const PAD = 2;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const SECONDS = MINUTES;
const PERIODS = ['AM', 'PM'];

type Parts = { h: number; m: number; s: number; ap: 'AM' | 'PM' };

export function timeToParts(value: string): Parts {
  const [hh = 0, mm = 0, ss = 0] = value.split(':').map((part) => Number(part) || 0);
  const hour = ((hh % 24) + 24) % 24;
  return {
    h: hour % 12 || 12,
    m: Math.min(59, Math.max(0, mm)),
    s: Math.min(59, Math.max(0, ss)),
    ap: hour >= 12 ? 'PM' : 'AM',
  };
}

export function partsToTime(parts: Parts): string {
  let hour = parts.h % 12;
  if (parts.ap === 'PM') hour += 12;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hour)}:${pad(parts.m)}:${pad(parts.s)}`;
}

function checkTimeRoundTrip() {
  for (const sample of ['00:00:00', '04:52:00', '12:00:00', '12:00:01', '13:05:09', '23:59:59']) {
    const back = partsToTime(timeToParts(sample));
    if (back !== sample) throw new Error(`time ${sample} -> ${back}`);
  }
}
checkTimeRoundTrip();

type WheelProps = {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  colors: ThemeColors;
};

function WheelColumn({ items, value, onChange, colors }: WheelProps) {
  const ref = useRef<ScrollView>(null);
  const ready = useRef(false);
  const startRef = useRef(Math.max(0, items.indexOf(value)));
  const start = startRef.current;

  useEffect(() => {
    const y = startRef.current * ITEM_H;
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollTo({ y, animated: false });
    });
    const timer = setTimeout(() => {
      ready.current = true;
    }, 150);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  const settle = (y: number) => {
    const index = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    const next = items[index];
    if (Math.abs(y - index * ITEM_H) > 1) {
      ref.current?.scrollTo({ y: index * ITEM_H, animated: true });
    }
    if (next && next !== value) onChange(next);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!ready.current) return;
    const index = Math.max(
      0,
      Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.y / ITEM_H)),
    );
    const next = items[index];
    if (next && next !== value) onChange(next);
  };

  return (
    <ScrollView
      ref={ref}
      style={styles.wheel}
      contentContainerStyle={styles.wheelContent}
      contentOffset={{ x: 0, y: start * ITEM_H }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      nestedScrollEnabled
      scrollEventThrottle={16}
      onScroll={onScroll}
      onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(event) => settle(event.nativeEvent.contentOffset.y)}
    >
      {items.map((item, index) => {
        const selected = item === value;
        return (
          <Pressable
            key={item}
            onPress={() => {
              onChange(item);
              ref.current?.scrollTo({ y: index * ITEM_H, animated: true });
            }}
            style={styles.item}
          >
            <Text
              style={[
                styles.itemText,
                {
                  color: selected ? colors.textPrimary : colors.textMuted,
                  fontFamily: selected ? fontFamily.bold : fontFamily.regular,
                  fontSize: selected ? 22 : 16,
                },
              ]}
            >
              {item}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  colors: ThemeColors;
};

export function AppleTimePicker({ value, onChange, colors }: Props) {
  const parts = timeToParts(value || '00:00:00');
  const update = (patch: Partial<Parts>) => onChange(partsToTime({ ...parts, ...patch }));

  return (
    <View>
      <View style={styles.labels}>
        {['H', 'M', 'S', 'AM/PM'].map((label) => (
          <Text key={label} style={[styles.label, { color: colors.textMuted }]}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.columns}>
        <View
          pointerEvents="none"
          style={[
            styles.highlight,
            { backgroundColor: colors.backgroundTertiary },
          ]}
        />
        <WheelColumn
          items={HOURS}
          value={String(parts.h)}
          onChange={(h) => update({ h: Number(h) })}
          colors={colors}
        />
        <WheelColumn
          items={MINUTES}
          value={String(parts.m).padStart(2, '0')}
          onChange={(m) => update({ m: Number(m) })}
          colors={colors}
        />
        <WheelColumn
          items={SECONDS}
          value={String(parts.s).padStart(2, '0')}
          onChange={(s) => update({ s: Number(s) })}
          colors={colors}
        />
        <WheelColumn
          items={PERIODS}
          value={parts.ap}
          onChange={(ap) => update({ ap: ap as Parts['ap'] })}
          colors={colors}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  columns: {
    height: ITEM_H * VISIBLE,
    flexDirection: 'row',
    marginHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_H * PAD,
    height: ITEM_H,
    borderRadius: radius.md,
  },
  wheel: {
    flex: 1,
  },
  wheelContent: {
    paddingVertical: ITEM_H * PAD,
  },
  item: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    lineHeight: 28,
  },
});
