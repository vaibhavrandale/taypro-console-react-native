import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { Navbar } from "../components/layout";
import { GatewayMapCard } from "../components/dashboard/GatewayMapCard";
import { GatewayCard } from "../components/gateways/GatewayCard";
import { Input } from "../components/ui";
import { fetchGatewaysBySite } from "../api/gateways";
import { useSiteDetails } from "../context/SiteDetailsContext";
import { useTheme } from "../theme";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import type { Gateway } from "../types/gateway";
import type { SiteGateway } from "../types/siteDetails";
import type { DrawerParamList } from "../navigation/types";
import { isGatewayOnline } from "../utils/gatewayStatus";
import { buildGatewayMapPoints } from "../utils/gateway";

type Navigation = DrawerNavigationProp<DrawerParamList, "Gateways">;

function toSiteGateway(
  gateway: Gateway,
  siteGateway?: SiteGateway,
): SiteGateway {
  return {
    gateway_name: gateway.gateway_name,
    gateway_id_in_lns_server: gateway.gateway_id_in_lns_server,
    gateway_lattitude:
      gateway.gateway_lattitude ?? siteGateway?.gateway_lattitude,
    gateway_longitude:
      gateway.gateway_longitude ?? siteGateway?.gateway_longitude,
    gateway_name_in_lns_server: gateway.gateway_name_in_lns_server,
    gateway_status: gateway.gateway_status,
    gateway_robot_no: gateway.gateway_robot_no ?? siteGateway?.gateway_robot_no,
    robot_count: siteGateway?.robot_count,
    location: siteGateway?.location,
    last_uplink: gateway.last_uplink ?? siteGateway?.last_uplink ?? undefined,
  };
}

function SummaryStrip({
  total,
  online,
  offline,
  types,
}: {
  total: number;
  online: number;
  offline: number;
  types: number;
}) {
  const { colors } = useTheme();

  const items = [
    { label: "Total", value: String(total), color: colors.textPrimary },
    { label: "Online", value: String(online), color: colors.primary },
    { label: "Offline", value: String(offline), color: colors.textMuted },
    { label: "Types", value: String(types), color: colors.badge.info.text },
  ];

  return (
    <View
      style={[
        styles.summaryStrip,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 ? (
            <View
              style={[
                styles.summaryDivider,
                { backgroundColor: colors.border },
              ]}
            />
          ) : null}
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryValue, { color: item.color }]}>
              {item.value}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              {item.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

export function GatewaysScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Navigation>();
  const { assignedSites, selectedSite, setSelectedSite, siteDetails } =
    useSiteDetails();

  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadGateways = useCallback(
    async (siteId: string, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const result = await fetchGatewaysBySite(siteId);
        setGateways(result);
      } catch (err) {
        setGateways([]);
        setError(
          err instanceof Error ? err.message : "Failed to load gateways",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedSite?.site_id) {
      setLoading(false);
      setGateways([]);
      return;
    }

    loadGateways(selectedSite.site_id);
  }, [selectedSite?.site_id, loadGateways]);

  const summary = useMemo(() => {
    const online = gateways.filter((g) =>
      isGatewayOnline(g.gateway_status),
    ).length;
    const types = new Set(gateways.map((g) => g.gateway_type).filter(Boolean))
      .size;

    return {
      total: gateways.length,
      online,
      offline: gateways.length - online,
      types,
    };
  }, [gateways]);

  const filteredGateways = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return gateways;

    return gateways.filter((gateway) => {
      const haystack = [
        gateway.gateway_name,
        gateway.gateway_name_in_lns_server,
        gateway.gateway_id,
        gateway.gateway_id_in_lns_server,
        gateway.gateway_type,
        gateway.gateway_robot_no,
        gateway.gateway_simnumber,
        gateway.gateway_lora_deveui,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [gateways, search]);

  const mapGateways = useMemo(() => {
    const siteGatewayById = new Map(
      (siteDetails?.gateways ?? []).map((gateway) => [
        gateway.gateway_id_in_lns_server,
        gateway,
      ]),
    );

    return gateways.map((gateway) =>
      toSiteGateway(
        gateway,
        siteGatewayById.get(gateway.gateway_id_in_lns_server),
      ),
    );
  }, [gateways, siteDetails?.gateways]);

  const mapRobots = siteDetails?.robots ?? [];

  useEffect(() => {
    if (!__DEV__ || !selectedSite?.site_id) return;

    const mapPoints = buildGatewayMapPoints(mapGateways, mapRobots);
  }, [mapGateways, mapRobots, selectedSite?.site_id]);

  const openGateway = useCallback(
    (gateway: Gateway) => {
      navigation.navigate("GatewayDetail", {
        gatewayId: gateway.gateway_id_in_lns_server,
        gatewayName: gateway.gateway_name || gateway.gateway_name_in_lns_server,
        gatewayType: gateway.gateway_type,
        gatewaySimNumber: gateway.gateway_simnumber,
        gatewayRobotNo: gateway.gateway_robot_no,
        gatewayLoraDeveui: gateway.gateway_lora_deveui,
        lastUplink: gateway.last_uplink,
        gatewayStatus: gateway.gateway_status,
      });
    },
    [navigation],
  );

  const header = (
    <View style={styles.headerContent}>
      {assignedSites.length > 1 ? (
        <View style={styles.sitePickerRow}>
          {assignedSites.map((site) => {
            const active = site.site_id === selectedSite?.site_id;
            return (
              <Pressable
                key={site.site_id}
                onPress={() => setSelectedSite(site)}
                style={[
                  styles.siteChip,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : colors.backgroundTertiary,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.siteChipText,
                    { color: active ? "#101936" : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {site.siteName || site.site_id}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : selectedSite ? (
        <View
          style={[
            styles.siteBanner,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="business-outline" size={14} color={colors.primary} />
          <Text
            style={[styles.siteBannerText, { color: colors.textSecondary }]}
          >
            {selectedSite.siteName || selectedSite.site_id}
          </Text>
        </View>
      ) : null}

      <SummaryStrip
        total={summary.total}
        online={summary.online}
        offline={summary.offline}
        types={summary.types}
      />

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Search gateway name, ID, type, robot..."
        leftIcon="search-outline"
      />

      {gateways.length > 0 ? (
        <GatewayMapCard gateways={mapGateways} robots={mapRobots} />
      ) : null}
    </View>
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar
        title="Gateways"
        subtitle={
          selectedSite
            ? `${selectedSite.siteName || selectedSite.site_id} · LoRaWAN coverage`
            : "LoRaWAN gateway health"
        }
      />

      {!selectedSite?.site_id ? (
        <View style={styles.centerState}>
          <Ionicons
            name="business-outline"
            size={40}
            color={colors.textMuted}
          />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No site assigned
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Your profile has no assigned sites. Gateways are loaded per site.
          </Text>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Loading gateways...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons
            name="cloud-offline-outline"
            size={40}
            color={colors.danger}
          />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Could not load gateways
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => loadGateways(selectedSite.site_id)}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredGateways}
          keyExtractor={(item) =>
            item._id ||
            `${item.gateway_id_in_lns_server}-${item.gateway_name_in_lns_server}`
          }
          renderItem={({ item }) => (
            <GatewayCard gateway={item} onPress={() => openGateway(item)} />
          )}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadGateways(selectedSite.site_id, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons
                name="radio-outline"
                size={36}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {search.trim() ? "No matching gateways" : "No gateways found"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {search.trim()
                  ? "Try a different search term."
                  : "This site has no gateways registered yet."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  headerContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  sitePickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  siteChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    maxWidth: "100%",
  },
  siteChipText: {
    ...typography.caption,
    fontWeight: "600",
  },
  siteBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  siteBannerText: {
    ...typography.caption,
    fontWeight: "600",
  },
  summaryStrip: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  summaryCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: 2,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
  },
  summaryValue: {
    ...typography.label,
    fontSize: 16,
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  separator: {
    height: spacing.sm,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyList: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.label,
    fontSize: 15,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: "center",
  },
  retryButton: {
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    ...typography.label,
    color: "#101936",
  },
});
