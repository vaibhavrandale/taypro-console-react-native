import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MapLocateButton } from '../map/MapLocateButton';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SiteGateway, SiteRobot } from '../../types/siteDetails';
import { buildGatewayMapPoints } from '../../utils/gateway';
import { getCurrentUserLocation, type UserMapLocation } from '../../utils/location';
import { buildGatewayLeafletHtml } from './gatewayMapHtml';

type Props = {
  gateways: SiteGateway[];
  robots?: SiteRobot[];
};

export function GatewayMapCard({ gateways, robots = [] }: Props) {
  const { colors, isDark } = useTheme();
  const [userLocation, setUserLocation] = useState<UserMapLocation | null>(null);
  const [focusUser, setFocusUser] = useState(false);
  const [locating, setLocating] = useState(false);

  const mapPoints = useMemo(
    () => buildGatewayMapPoints(gateways, robots),
    [gateways, robots],
  );

  const html = useMemo(
    () => buildGatewayLeafletHtml(mapPoints, isDark, userLocation, focusUser),
    [mapPoints, isDark, userLocation, focusUser],
  );

  const handleLocateMe = useCallback(async () => {
    setLocating(true);
    try {
      const location = await getCurrentUserLocation();
      setUserLocation(location);
      setFocusUser(true);
    } catch (err) {
      Alert.alert(
        'Location unavailable',
        err instanceof Error ? err.message : 'Could not get your current location.',
      );
    } finally {
      setLocating(false);
    }
  }, []);

  const showMap = mapPoints.length > 0 || userLocation != null;

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
              : userLocation
                ? 'Your location · tap locate to refresh'
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
        {showMap ? (
          <>
            <WebView
              key={`${html}-${focusUser ? 'focus' : 'default'}`}
              originWhitelist={['*']}
              source={{ html }}
              style={styles.map}
              scrollEnabled={false}
              nestedScrollEnabled
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
            />
            <MapLocateButton onPress={handleLocateMe} loading={locating} />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No gateway locations found for this site yet.
            </Text>
            <MapLocateButton onPress={handleLocateMe} loading={locating} />
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
    position: 'relative',
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
    position: 'relative',
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
