import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SiteGateway, SiteRobot } from '../../types/siteDetails';
import { buildGatewayMapPoints } from '../../utils/gateway';
import { buildGatewayLeafletHtml } from './gatewayMapHtml';

type Props = {
  gateways: SiteGateway[];
  robots?: SiteRobot[];
};

export function GatewayMapCard({ gateways, robots = [] }: Props) {
  const { colors, isDark } = useTheme();

  const mapPoints = useMemo(
    () => buildGatewayMapPoints(gateways, robots),
    [gateways, robots],
  );

  const html = useMemo(
    () => buildGatewayLeafletHtml(mapPoints, isDark),
    [mapPoints, isDark],
  );

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
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Gateway Coverage
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {mapPoints.length > 0
              ? `${mapPoints.length} gateway${mapPoints.length === 1 ? '' : 's'} · satellite · 1 km radius`
              : 'Waiting for gateway coordinates'}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.mapWrap,
          { borderColor: colors.border, backgroundColor: colors.backgroundTertiary },
        ]}
      >
        {mapPoints.length > 0 ? (
          <WebView
            originWhitelist={['*']}
            source={{ html }}
            style={styles.map}
            scrollEnabled={false}
            nestedScrollEnabled
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No gateway locations found for this site yet.
            </Text>
          </View>
        )}
      </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.h3,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  mapWrap: {
    height: 260,
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
  },
});
