import React from 'react';
import {
  RefreshControlProps,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/spacing';
import { useContentBottomPadding } from '../../hooks/useContentBottomPadding';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
  keyboardShouldPersistTaps = 'always',
  refreshControl,
}: Props) {
  const { colors } = useTheme();
  const bottomPad = useContentBottomPadding(spacing.xl);

  const content = (
    <View
      style={[
        !scroll && styles.inner,
        padded && styles.padded,
        { paddingBottom: bottomPad },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
