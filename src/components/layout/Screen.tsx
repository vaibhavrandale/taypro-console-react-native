import React from 'react';
import {
  RefreshControl,
  RefreshControlProps,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/spacing';

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
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={[
        styles.inner,
        padded && styles.padded,
        { paddingBottom: insets.bottom + spacing.lg },
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
