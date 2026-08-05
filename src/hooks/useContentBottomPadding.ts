import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/spacing';

/**
 * Bottom padding so content isn't hidden behind the bottom tab bar
 * (or the home indicator outside tabs).
 */
export function useContentBottomPadding(extra: number = spacing.lg) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext);

  if (tabBarHeight != null && tabBarHeight > 0) {
    return tabBarHeight + extra;
  }

  return insets.bottom + extra;
}
