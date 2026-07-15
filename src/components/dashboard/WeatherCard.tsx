import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

type Atmosphere = {
  colors: [string, string, string];
  text: string;
  muted: string;
  pillBg: string;
  pillText: string;
  accent: string;
  headline: string;
};

function getAtmosphere(condition: WeatherCondition): Atmosphere {
  switch (condition) {
    case 'sunny':
      return {
        colors: ['#FFB347', '#FFCC70', '#FFE29A'],
        text: '#1F2937',
        muted: 'rgba(31, 41, 55, 0.72)',
        pillBg: 'rgba(255, 255, 255, 0.45)',
        pillText: '#1F2937',
        accent: '#FFFFFF',
        headline: "Clear skies at your site",
      };
    case 'cloudy':
      return {
        colors: ['#8E9EAB', '#B8C6DB', '#D5DEE8'],
        text: '#1F2937',
        muted: 'rgba(31, 41, 55, 0.7)',
        pillBg: 'rgba(255, 255, 255, 0.42)',
        pillText: '#1F2937',
        accent: '#F8FAFC',
        headline: 'Clouds overhead',
      };
    case 'rainy':
      return {
        colors: ['#3A4A5C', '#5B7C99', '#7FA1B8'],
        text: '#F8FAFC',
        muted: 'rgba(248, 250, 252, 0.78)',
        pillBg: 'rgba(15, 23, 42, 0.28)',
        pillText: '#F8FAFC',
        accent: '#E2E8F0',
        headline: "It's raining at your site",
      };
    case 'stormy':
      return {
        colors: ['#1E293B', '#334155', '#475569'],
        text: '#F8FAFC',
        muted: 'rgba(248, 250, 252, 0.75)',
        pillBg: 'rgba(15, 23, 42, 0.35)',
        pillText: '#F8FAFC',
        accent: '#CBD5E1',
        headline: 'Stormy weather outside',
      };
    case 'foggy':
      return {
        colors: ['#9CA3AF', '#D1D5DB', '#E5E7EB'],
        text: '#1F2937',
        muted: 'rgba(31, 41, 55, 0.68)',
        pillBg: 'rgba(255, 255, 255, 0.5)',
        pillText: '#1F2937',
        accent: '#FFFFFF',
        headline: 'Low visibility nearby',
      };
    default:
      return {
        colors: ['#60A5FA', '#93C5FD', '#BFDBFE'],
        text: '#1F2937',
        muted: 'rgba(31, 41, 55, 0.7)',
        pillBg: 'rgba(255, 255, 255, 0.45)',
        pillText: '#1F2937',
        accent: '#FFFFFF',
        headline: 'Live site weather',
      };
  }
}

/** Soft multi-ellipse cloud — closer to delivery-app weather art than hard circles. */
function SoftCloud({
  width,
  top,
  left,
  opacity = 1,
  shade = '#FFFFFF',
}: {
  width: number;
  top: number;
  left: number;
  opacity?: number;
  shade?: string;
}) {
  const h = width * 0.42;
  return (
    <View
      style={{
        position: 'absolute',
        top,
        left,
        width,
        height: h,
        opacity,
      }}
    >
      <View
        style={[
          styles.ellipse,
          {
            width: width * 0.42,
            height: h * 0.78,
            left: width * 0.05,
            bottom: 0,
            backgroundColor: shade,
          },
        ]}
      />
      <View
        style={[
          styles.ellipse,
          {
            width: width * 0.55,
            height: h * 0.95,
            left: width * 0.22,
            bottom: h * 0.08,
            backgroundColor: shade,
          },
        ]}
      />
      <View
        style={[
          styles.ellipse,
          {
            width: width * 0.4,
            height: h * 0.72,
            left: width * 0.52,
            bottom: 0,
            backgroundColor: shade,
          },
        ]}
      />
      <View
        style={[
          styles.ellipse,
          {
            width: width * 0.78,
            height: h * 0.55,
            left: width * 0.1,
            bottom: 0,
            backgroundColor: shade,
          },
        ]}
      />
    </View>
  );
}

function DriftCloud(props: {
  width: number;
  top: number;
  from: number;
  travel: number;
  duration: number;
  delay?: number;
  opacity?: number;
  shade?: string;
}) {
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    let active: Animated.CompositeAnimation | null = null;

    const drift = () => {
      if (cancelled) return;
      x.setValue(0);
      active = Animated.timing(x, {
        toValue: 1,
        duration: props.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      active.start(({ finished }) => {
        if (finished && !cancelled) drift();
      });
    };

    startTimer = setTimeout(drift, props.delay ?? 0);

    return () => {
      cancelled = true;
      if (startTimer) clearTimeout(startTimer);
      active?.stop();
    };
  }, [props.delay, props.duration, x]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: props.top,
        left: props.from,
        width: props.width,
        height: props.width * 0.42,
        transform: [
          {
            translateX: x.interpolate({
              inputRange: [0, 1],
              outputRange: [0, props.travel],
            }),
          },
        ],
      }}
    >
      <SoftCloud
        width={props.width}
        top={0}
        left={0}
        opacity={props.opacity ?? 0.92}
        shade={props.shade}
      />
    </Animated.View>
  );
}

function RainLayer({ count, sceneH }: { count: number; sceneH: number }) {
  const drops = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: (i * 17 + 5) % 100,
        delay: (i * 73) % 900,
        len: 10 + (i % 5) * 3,
        dur: 700 + (i % 6) * 55,
        thick: i % 4 === 0 ? 2 : 1.25,
      })),
    [count],
  );

  return (
    <>
      {drops.map((d) => (
        <RainDrop key={d.id} {...d} sceneH={sceneH} />
      ))}
    </>
  );
}

function RainDrop({
  left,
  delay,
  len,
  dur,
  thick,
  sceneH,
}: {
  left: number;
  delay: number;
  len: number;
  dur: number;
  thick: number;
  sceneH: number;
}) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    let active: Animated.CompositeAnimation | null = null;

    // Explicit reset each pass — Animated.loop + native driver often stalls after 1st fall.
    const fall = () => {
      if (cancelled) return;
      y.setValue(0);
      active = Animated.timing(y, {
        toValue: 1,
        duration: dur,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      active.start(({ finished }) => {
        if (finished && !cancelled) fall();
      });
    };

    startTimer = setTimeout(fall, delay);

    return () => {
      cancelled = true;
      if (startTimer) clearTimeout(startTimer);
      active?.stop();
    };
  }, [delay, dur, y]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${left}%`,
        width: thick,
        height: len,
        borderRadius: 2,
        backgroundColor: 'rgba(226, 232, 240, 0.75)',
        opacity: y.interpolate({
          inputRange: [0, 0.12, 0.88, 1],
          outputRange: [0, 0.9, 0.7, 0],
        }),
        transform: [
          { rotate: '-14deg' },
          {
            translateY: y.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, sceneH + 10],
            }),
          },
        ],
      }}
    />
  );
}

function WeatherArt({ condition }: { condition: WeatherCondition }) {
  if (condition === 'sunny' || condition === 'unknown') {
    return (
      <View style={styles.artStage} pointerEvents="none">
        <View style={[styles.sunGlow, { width: 120, height: 120, opacity: 0.35 }]} />
        <View style={[styles.sunGlow, { width: 88, height: 88, opacity: 0.5 }]} />
        <View style={styles.sunDisk} />
        <SoftCloud width={110} top={78} left={-18} opacity={0.95} shade="#FFFFFF" />
        <SoftCloud width={78} top={92} left={70} opacity={0.88} shade="#FFF7ED" />
      </View>
    );
  }

  if (condition === 'cloudy') {
    return (
      <View style={styles.artStage} pointerEvents="none">
        <DriftCloud
          width={130}
          top={28}
          from={-90}
          travel={280}
          duration={26000}
          shade="#F8FAFC"
          opacity={0.95}
        />
        <DriftCloud
          width={100}
          top={58}
          from={-120}
          travel={300}
          duration={32000}
          delay={600}
          shade="#E2E8F0"
          opacity={0.9}
        />
        <DriftCloud
          width={88}
          top={88}
          from={-70}
          travel={260}
          duration={29000}
          delay={1400}
          shade="#F1F5F9"
          opacity={0.85}
        />
      </View>
    );
  }

  if (condition === 'rainy' || condition === 'stormy') {
    const heavy = condition === 'stormy';
    return (
      <View style={styles.artStage} pointerEvents="none">
        <SoftCloud
          width={140}
          top={8}
          left={20}
          opacity={0.95}
          shade={heavy ? '#94A3B8' : '#CBD5E1'}
        />
        <SoftCloud
          width={110}
          top={22}
          left={-30}
          opacity={0.9}
          shade={heavy ? '#64748B' : '#94A3B8'}
        />
        <SoftCloud
          width={96}
          top={14}
          left={100}
          opacity={0.88}
          shade={heavy ? '#788797' : '#E2E8F0'}
        />
        <RainLayer count={heavy ? 32 : 24} sceneH={160} />
      </View>
    );
  }

  // foggy
  return (
    <View style={styles.artStage} pointerEvents="none">
      <SoftCloud width={140} top={40} left={-20} opacity={0.45} shade="#FFFFFF" />
      <SoftCloud width={120} top={70} left={40} opacity={0.35} shade="#F8FAFC" />
      <View style={[styles.fogBand, { top: 50, opacity: 0.4 }]} />
      <View style={[styles.fogBand, { top: 78, opacity: 0.28 }]} />
      <View style={[styles.fogBand, { top: 104, opacity: 0.2 }]} />
    </View>
  );
}

const WeatherHero = memo(function WeatherHero({ weather }: Props) {
  const condition = useMemo(() => getWeatherCondition(weather), [weather]);
  const label = getWeatherLabel(condition, weather);
  const atmosphere = useMemo(() => getAtmosphere(condition), [condition]);
  const temp =
    weather.temperature != null ? Math.round(weather.temperature) : null;

  return (
    <LinearGradient
      colors={atmosphere.colors}
      start={{ x: 0.05, y: 0 }}
      end={{ x: 0.95, y: 1 }}
      style={styles.hero}
    >
      <WeatherArt condition={condition} />

      <View style={styles.heroContent}>
        <View style={styles.liveRow}>
          <View
            style={[styles.liveDot, { backgroundColor: atmosphere.accent }]}
          />
          <Text style={[styles.liveText, { color: atmosphere.muted }]}>
            Live weather
          </Text>
        </View>

        <View style={styles.tempRow}>
          {temp != null ? (
            <Text style={[styles.temp, { color: atmosphere.text }]}>
              {temp}
              <Text style={styles.degree}>°</Text>
            </Text>
          ) : (
            <Text style={[styles.temp, { color: atmosphere.text }]}>—</Text>
          )}
        </View>

        <Text style={[styles.headline, { color: atmosphere.text }]}>
          {atmosphere.headline}
        </Text>
        <Text style={[styles.conditionLabel, { color: atmosphere.muted }]}>
          {label}
        </Text>

        {weather.location ? (
          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={13}
              color={atmosphere.muted}
            />
            <Text
              style={[styles.location, { color: atmosphere.muted }]}
              numberOfLines={1}
            >
              {weather.location}
            </Text>
          </View>
        ) : null}

        <View style={styles.pills}>
          {weather.humidity != null ? (
            <View style={[styles.pill, { backgroundColor: atmosphere.pillBg }]}>
              <Ionicons
                name="water-outline"
                size={12}
                color={atmosphere.pillText}
              />
              <Text style={[styles.pillText, { color: atmosphere.pillText }]}>
                {weather.humidity}%
              </Text>
            </View>
          ) : null}
          {weather.wind_speed != null ? (
            <View style={[styles.pill, { backgroundColor: atmosphere.pillBg }]}>
              <Ionicons
                name="navigate-outline"
                size={12}
                color={atmosphere.pillText}
              />
              <Text style={[styles.pillText, { color: atmosphere.pillText }]}>
                {weather.wind_speed} km/h
              </Text>
            </View>
          ) : null}
          {weather.cloudiness != null ? (
            <View style={[styles.pill, { backgroundColor: atmosphere.pillBg }]}>
              <Ionicons
                name="cloud-outline"
                size={12}
                color={atmosphere.pillText}
              />
              <Text style={[styles.pillText, { color: atmosphere.pillText }]}>
                {weather.cloudiness}%
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
});

export function WeatherCard({ weather }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: colors.backgroundSecondary,
        },
      ]}
    >
      <WeatherHero weather={weather} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  hero: {
    minHeight: 188,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  heroContent: {
    zIndex: 2,
    maxWidth: '68%',
    gap: 4,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  temp: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '700',
    letterSpacing: -1.5,
  },
  degree: {
    fontSize: 32,
    fontWeight: '600',
  },
  headline: {
    ...typography.label,
    fontSize: 16,
    marginTop: 2,
  },
  conditionLabel: {
    ...typography.bodySmall,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  location: {
    ...typography.caption,
    fontSize: 12,
    flexShrink: 1,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pillText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  artStage: {
    ...StyleSheet.absoluteFillObject,
  },
  sunGlow: {
    position: 'absolute',
    top: 18,
    right: 18,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
  },
  sunDisk: {
    position: 'absolute',
    top: 36,
    right: 36,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FBBF24',
    borderWidth: 3,
    borderColor: 'rgba(255, 251, 235, 0.95)',
  },
  ellipse: {
    position: 'absolute',
    borderRadius: 999,
  },
  fogBand: {
    position: 'absolute',
    left: -30,
    right: -30,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});
