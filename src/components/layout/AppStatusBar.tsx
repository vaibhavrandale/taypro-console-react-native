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

    // animated=false — theme toggle should feel instant, not a status-bar fade.
    RNStatusBar.setTranslucent(false);
    RNStatusBar.setBackgroundColor(backgroundColor, false);
    RNStatusBar.setBarStyle(
      overlay || isDark ? 'light-content' : 'dark-content',
      false,
    );
  }, [overlay, isDark, backgroundColor]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    RNStatusBar.setBarStyle(
      overlay || isDark ? 'light-content' : 'dark-content',
      false,
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
