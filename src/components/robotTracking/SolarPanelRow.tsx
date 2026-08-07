import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RobotTracking } from '../../types/robotTracking';
import { getRobotMarkerColor } from '../../utils/robot';
import {
  getHighestTrackPoint,
  getRobotPhase,
  getStatusText,
  getTrackVisualState,
} from '../../utils/robotTrackingHelpers';

type Props = {
  robot: RobotTracking;
  maxRowLength: number;
  onPress: (robot: RobotTracking) => void;
};

function GearBadge({
  status,
  spin,
}: {
  status: 'progress' | 'failed' | 'finished';
  spin: 'cw' | 'ccw' | null;
}) {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spin) {
      rotate.stopAnimation();
      rotate.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [rotate, spin]);

  const color =
    status === 'progress'
      ? 'rgb(255, 187, 61)'
      : status === 'failed'
        ? 'rgb(250, 28, 28)'
        : 'limegreen';

  const spinInterpolated = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: spin === 'ccw' ? ['0deg', '-360deg'] : ['0deg', '360deg'],
  });

  return (
    <View style={[styles.gear, { borderColor: color }]}>
      <Animated.View
        style={[
          styles.gearIcon,
          spin ? { transform: [{ rotate: spinInterpolated }] } : null,
        ]}
      >
        <Ionicons name="settings-sharp" size={10} color={color} />
      </Animated.View>
      {status === 'failed' && (
        <View style={[styles.gearBadge, { backgroundColor: color }]}>
          <Ionicons name="close" size={7} color="#fff" />
        </View>
      )}
      {status === 'finished' && (
        <View style={[styles.gearBadge, { backgroundColor: color }]}>
          <Ionicons name="checkmark" size={7} color="#fff" />
        </View>
      )}
    </View>
  );
}

export function SolarPanelRow({ robot, maxRowLength, onPress }: Props) {
  const L = Number(robot.row_length) || 1;
  const maxL = Math.max(Number(maxRowLength) || L, L);
  const trackWidthPct = Math.max(40, Math.min(100, (L / maxL) * 100));

  const highestPoint = getHighestTrackPoint(robot.track_details);
  const { phase, segmentPct } = getRobotPhase(
    highestPoint,
    L,
    robot.cleaning,
    robot.track_details || [],
  );
  const statusText = getStatusText(robot, phase);
  const visual = getTrackVisualState(robot, statusText, phase);
  const leftPct = Math.max(0, Math.min(1, segmentPct)) * 100;
  const markerColor = getRobotMarkerColor(robot.lora_state, robot.last_status);

  return (
    <Pressable style={styles.wrap} onPress={() => onPress(robot)}>
      <View
        style={[styles.rowOuter, { width: `${trackWidthPct}%` as `${number}%` }]}
      >
        <Text style={[styles.endpoint, styles.ds]}>DS</Text>
        <Text style={[styles.endpoint, styles.rs]}>RS</Text>

        <View style={[styles.track, { borderColor: visual.borderColor }]}>
          <View style={styles.stripeOverlay} pointerEvents="none">
            {Array.from({ length: 18 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.stripe,
                  i % 2 === 0 ? styles.stripeDark : styles.stripeLight,
                ]}
              />
            ))}
          </View>

          <View
            style={[styles.label, robot.is_delete && styles.labelDeleted]}
          >
            <View
              style={[styles.onlineDot, { backgroundColor: markerColor }]}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.labelText,
                robot.is_delete && styles.labelTextDeleted,
              ]}
            >
              {robot.robot_no}
            </Text>
          </View>
        </View>

        {/* Sibling of track — avoids Android overflow clipping */}
        <View
          pointerEvents="none"
          style={[
            styles.robotMarker,
            { left: `${leftPct}%` as `${number}%` },
          ]}
        >
          {visual.gearStatus ? (
            <GearBadge status={visual.gearStatus} spin={visual.gearSpin} />
          ) : null}
          <Image
            source={require('../../../assets/images/robot.png')}
            style={styles.robotImg}
            resizeMode="contain"
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 22,
    paddingVertical: 4,
    width: '100%',
  },
  rowOuter: {
    position: 'relative',
    height: 40,
    maxWidth: '100%',
    justifyContent: 'center',
    overflow: 'visible',
  },
  endpoint: {
    position: 'absolute',
    top: '50%',
    marginTop: -6,
    color: '#0277BD',
    fontWeight: '700',
    fontSize: 10,
    zIndex: 2,
  },
  ds: { left: -20 },
  rs: { right: -20 },
  track: {
    height: 32,
    width: '100%',
    borderRadius: 3,
    borderWidth: 2,
    backgroundColor: '#0d47a1',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  stripeOverlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 1,
  },
  stripe: {
    flex: 1,
    height: '100%',
  },
  stripeDark: {
    backgroundColor: 'rgba(13,71,161,0.9)',
  },
  stripeLight: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    maxWidth: 2,
    flexGrow: 0,
    flexBasis: 2,
  },
  label: {
    position: 'absolute',
    left: 6,
    zIndex: 3,
    maxWidth: '55%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111',
    flexShrink: 1,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  labelDeleted: {
    backgroundColor: 'red',
  },
  labelTextDeleted: {
    color: '#fff',
  },
  robotMarker: {
    position: 'absolute',
    top: '50%',
    width: 34,
    height: 44,
    marginTop: -22,
    marginLeft: -17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
    elevation: 8,
  },
  robotImg: {
    width: 32,
    height: 42,
  },
  gear: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: '#0b1220',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9,
  },
  gearIcon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearBadge: {
    position: 'absolute',
    right: -3,
    bottom: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
