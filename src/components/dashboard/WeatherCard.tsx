import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SiteWeather } from '../../types/siteDetails';
import {
  getWeatherCondition,
  getWeatherLabel,
  WeatherCondition,
} from '../../utils/weather';

type Props = {
  weather: SiteWeather;
};

function CloudShape({
  size,
  top,
  left,
  opacity = 0.9,
}: {
  size: number;
  top: number;
  left: number;
  opacity?: number;
}) {
  return (
    <View
      style={[
        styles.cloud,
        {
          width: size,
          height: size * 0.55,
          top,
          left,
          opacity,
        },
      ]}
    >
      <View style={[styles.cloudPuff, { width: size * 0.42, height: size * 0.42, left: 0 }]} />
      <View
        style={[
          styles.cloudPuff,
          { width: size * 0.55, height: size * 0.55, left: size * 0.18, top: -size * 0.12 },
        ]}
      />
      <View
        style={[
          styles.cloudPuff,
          { width: size * 0.48, height: size * 0.48, left: size * 0.48, top: -size * 0.04 },
        ]}
      />
    </View>
  );
}

function RainDrop({ left, delay, height }: { left: number; delay: number; height: number }) {
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, {
          toValue: height + 20,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -12,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, height, translateY]);

  return (
    <Animated.View
      style={[
        styles.rainDrop,
        {
          left: `${left}%`,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

function WeatherScene({ condition }: { condition: WeatherCondition }) {
  const skyStyles = {
    sunny: styles.skySunny,
    cloudy: styles.skyCloudy,
    rainy: styles.skyRainy,
    stormy: styles.skyStormy,
    foggy: styles.skyFoggy,
    unknown: styles.skyCloudy,
  } as const;

  return (
    <View style={[styles.scene, skyStyles[condition]]}>
      {(condition === 'sunny' || condition === 'unknown') && (
        <>
          <View style={styles.sun} />
          <View style={styles.sunGlow} />
          <CloudShape size={54} top={18} left={118} opacity={0.95} />
          <CloudShape size={42} top={42} left={24} opacity={0.88} />
        </>
      )}

      {condition === 'cloudy' && (
        <>
          <CloudShape size={64} top={16} left={88} opacity={0.95} />
          <CloudShape size={50} top={34} left={18} opacity={0.9} />
          <CloudShape size={44} top={52} left={150} opacity={0.82} />
        </>
      )}

      {(condition === 'rainy' || condition === 'stormy') && (
        <>
          <CloudShape size={70} top={10} left={70} opacity={0.95} />
          <CloudShape size={52} top={28} left={10} opacity={0.9} />
          {Array.from({ length: 12 }).map((_, index) => (
            <RainDrop
              key={index}
              left={8 + index * 7.5}
              delay={index * 70}
              height={72}
            />
          ))}
        </>
      )}

      {condition === 'foggy' && (
        <>
          <View style={[styles.fogLayer, { top: 28, opacity: 0.45 }]} />
          <View style={[styles.fogLayer, { top: 48, opacity: 0.32 }]} />
          <View style={[styles.fogLayer, { top: 66, opacity: 0.22 }]} />
        </>
      )}
    </View>
  );
}

export function WeatherCard({ weather }: Props) {
  const { colors } = useTheme();
  const condition = useMemo(() => getWeatherCondition(weather), [weather]);
  const label = getWeatherLabel(condition, weather);

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
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Weather</Text>
        <Text style={[styles.condition, { color: colors.primary }]}>{label}</Text>
      </View>

      <WeatherScene condition={condition} />

      <View style={styles.metricsRow}>
        {weather.temperature != null ? (
          <Metric icon="thermometer-outline" label="Temp" value={`${weather.temperature}°C`} />
        ) : null}
        {weather.humidity != null ? (
          <Metric icon="water-outline" label="Humidity" value={`${weather.humidity}%`} />
        ) : null}
        {weather.wind_speed != null ? (
          <Metric icon="speedometer-outline" label="Wind" value={`${weather.wind_speed} km/h`} />
        ) : null}
      </View>

      {weather.location ? (
        <Text style={[styles.location, { color: colors.textMuted }]}>
          {weather.location}
        </Text>
      ) : null}
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.metric, { backgroundColor: colors.backgroundTertiary }]}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.h3,
  },
  condition: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  scene: {
    height: 108,
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  skySunny: {
    backgroundColor: '#7DD3FC',
  },
  skyCloudy: {
    backgroundColor: '#94A3B8',
  },
  skyRainy: {
    backgroundColor: '#64748B',
  },
  skyStormy: {
    backgroundColor: '#475569',
  },
  skyFoggy: {
    backgroundColor: '#CBD5E1',
  },
  sun: {
    position: 'absolute',
    top: 18,
    right: 22,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FDE047',
  },
  sunGlow: {
    position: 'absolute',
    top: 10,
    right: 14,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(253, 224, 71, 0.28)',
  },
  cloud: {
    position: 'absolute',
  },
  cloudPuff: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  rainDrop: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 14,
    borderRadius: 2,
    backgroundColor: 'rgba(191, 219, 254, 0.95)',
  },
  fogLayer: {
    position: 'absolute',
    left: -20,
    right: -20,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metric: {
    flexGrow: 1,
    minWidth: '30%',
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  metricValue: {
    ...typography.label,
    fontSize: 12,
  },
  location: {
    ...typography.caption,
  },
});
