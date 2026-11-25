import React, { useEffect } from 'react';
import { StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useStatusBarOverlayState } from '../../context/StatusBarOverlayContext';
import { useTheme } from '../../theme';

type Props = {
  /** Force icon style when a dark overlay (e.g. image viewer) is open */
  overlay?: boolean;
};

export function AppStatusBar({ overlay: overlayProp = false }: Props) {
  const { isDark } = useTheme();
  const overlayFromContext = useStatusBarOverlayState();
  const overlay = overlayProp || overlayFromContext;
  const barStyle = overlay ? 'light' : isDark ? 'light' : 'dark';

  useEffect(() => {
    RNStatusBar.setBarStyle(
      overlay || isDark ? 'light-content' : 'dark-content',
      false,
    );
  }, [overlay, isDark]);

  return <StatusBar style={barStyle} />;
}
