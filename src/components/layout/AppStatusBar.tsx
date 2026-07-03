import React, { useEffect } from 'react';
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useStatusBarOverlayState } from '../../context/StatusBarOverlayContext';
import { useTheme } from '../../theme';

type Props = {
  /** Force icon style when a dark overlay (e.g. image viewer) is open */
  overlay?: boolean;
};

export function AppStatusBar({ overlay: overlayProp = false }: Props) {
  const { isDark, colors } = useTheme();
  const overlayFromContext = useStatusBarOverlayState();
  const overlay = overlayProp || overlayFromContext;
  const barStyle = overlay ? 'light' : isDark ? 'light' : 'dark';
  const backgroundColor = overlay ? '#000000' : colors.navbar;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    RNStatusBar.setTranslucent(false);
    RNStatusBar.setBackgroundColor(backgroundColor, true);
    RNStatusBar.setBarStyle(
      overlay || isDark ? 'light-content' : 'dark-content',
      true,
    );
  }, [overlay, isDark, backgroundColor]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    RNStatusBar.setBarStyle(
      overlay || isDark ? 'light-content' : 'dark-content',
      true,
    );
  }, [overlay, isDark]);

  return (
    <StatusBar
      style={barStyle}
      backgroundColor={backgroundColor}
      translucent={false}
    />
  );
}
