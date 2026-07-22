import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button } from '../ui';
import { useStatusBarOverlay } from '../../context/StatusBarOverlayContext';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = {
  images: { src: string; label: string }[];
  initialIndex?: number;
  onClose: () => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetZoom = () => {
    'worklet';
    scale.value = withTiming(MIN_SCALE);
    savedScale.value = MIN_SCALE;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(next, MIN_SCALE), MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= MIN_SCALE + 0.05) {
        resetZoom();
      }
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.value <= MIN_SCALE) return;
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > MIN_SCALE) {
        resetZoom();
        return;
      }
      scale.value = withTiming(DOUBLE_TAP_SCALE);
      savedScale.value = DOUBLE_TAP_SCALE;
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.zoomWrap, animatedStyle]}>
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

export function PmImageLightbox({
  images,
  initialIndex = 0,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);

  useStatusBarOverlay(true);

  const current = images[index];
  const canNav = images.length > 1;

  const go = (delta: number) => {
    setIndex((i) => (i + delta + images.length) % images.length);
  };

  const meta = useMemo(
    () => `${index + 1} / ${images.length}`,
    [index, images.length],
  );

  if (!current) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Modal needs its own root for pinch/pan on Android */}
      <GestureHandlerRootView style={styles.flex}>
        <View
          style={[
            styles.backdrop,
            {
              backgroundColor: '#000',
              paddingTop: insets.top + spacing.sm,
              paddingBottom: insets.bottom + spacing.sm,
            },
          ]}
        >
          <View style={styles.topBar}>
            <Text style={styles.label} numberOfLines={1}>
              {current.label}
            </Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.stage}>
            {canNav ? (
              <Pressable onPress={() => go(-1)} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>
            ) : (
              <View style={styles.navSpacer} />
            )}
            <ZoomableImage key={current.src} uri={current.src} />
            {canNav ? (
              <Pressable onPress={() => go(1)} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </Pressable>
            ) : (
              <View style={styles.navSpacer} />
            )}
          </View>

          <View style={styles.footer}>
            <Badge label={meta} variant="neutral" size="sm" />
            <Button title="Close" size="sm" variant="outline" onPress={onClose} />
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  label: {
    flex: 1,
    color: '#fff',
    ...typography.label,
    fontSize: 14,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  zoomWrap: {
    flex: 1,
    height: '100%',
  },
  image: { width: '100%', height: '100%' },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  navSpacer: { width: 40 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
