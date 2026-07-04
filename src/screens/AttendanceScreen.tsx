import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Navbar, Screen } from "../components/layout";
import { PunchCaptureModal } from "../components/attendance/PunchCaptureModal";
import { buildAttendanceMapHtml } from "../components/attendance/attendanceMapHtml";
import { MapLocateButton } from "../components/map/MapLocateButton";
import { Badge, Button } from "../components/ui";
import { fetchPunchStatus, punchIn, punchOut } from "../api/attendance";
import {
  fetchSiteCoordinates,
  parseSiteCoordinateNumbers,
} from "../api/siteCoordinates";
import { useAuth } from "../context/AuthContext";
import { useLocationTracking } from "../context/LocationTrackingContext";
import { useTheme } from "../theme";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import type { PunchStatus } from "../types/attendance";
import type { SiteCoordinates } from "../types/siteCoordinates";
import { formatDateTimeIST } from "../utils/datetime";
import type { AttendanceStackParamList } from "../navigation/types";
import {
  formatDistance,
  getDistanceMeters,
  isWithinRadius,
} from "../utils/geofence";

type UserLocation = {
  lat: number;
  lng: number;
};

type PunchMode = "in" | "out" | null;

export function AttendanceScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { refreshTrackingState } = useLocationTracking();
  const navigation =
    useNavigation<NativeStackNavigationProp<AttendanceStackParamList>>();
  const userId = user?._id ?? "";

  const assignedSites = useMemo(
    () => (user?.assigned_sites ?? []).filter((site) => site.site_id),
    [user?.assigned_sites],
  );

  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [siteCoords, setSiteCoords] = useState<SiteCoordinates | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState("");
  const [coordsError, setCoordsError] = useState("");
  const [punchStatus, setPunchStatus] = useState<PunchStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punchMode, setPunchMode] = useState<PunchMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [focusUser, setFocusUser] = useState(false);
  const [locating, setLocating] = useState(false);

  const siteNumbers = useMemo(
    () => (siteCoords ? parseSiteCoordinateNumbers(siteCoords) : null),
    [siteCoords],
  );

  const distanceMeters = useMemo(() => {
    if (!userLocation || !siteNumbers) return null;
    return getDistanceMeters(
      userLocation.lat,
      userLocation.lng,
      siteNumbers.latitude,
      siteNumbers.longitude,
    );
  }, [userLocation, siteNumbers]);

  const isInside = useMemo(() => {
    if (!userLocation || !siteNumbers) return false;
    return isWithinRadius(
      userLocation.lat,
      userLocation.lng,
      siteNumbers.latitude,
      siteNumbers.longitude,
      siteNumbers.radiusMeters,
    );
  }, [userLocation, siteNumbers]);

  const showPunchOut = Boolean(
    punchStatus?.punchedIn && !punchStatus?.punchedOut,
  );

  const punchCompleteToday = Boolean(
    punchStatus?.punchedIn && punchStatus?.punchedOut,
  );

  const mapHtml = useMemo(() => {
    if (!siteNumbers) return "";
    return buildAttendanceMapHtml(
      { latitude: siteNumbers.latitude, longitude: siteNumbers.longitude },
      siteNumbers.radiusMeters,
      {
        user: userLocation
          ? { latitude: userLocation.lat, longitude: userLocation.lng }
          : null,
      },
      focusUser,
    );
  }, [siteNumbers, userLocation, focusUser]);

  const punchInLocation = punchStatus?.data?.punchin_location;
  const punchOutLocation = punchStatus?.data?.punchout_location;
  const punchInImage = punchStatus?.data?.punch_in_image;
  const punchOutImage = punchStatus?.data?.punch_out_image;

  const punchStatusMapHtml = useMemo(() => {
    if (!siteNumbers || !punchInLocation) return "";
    const { lat, lng } = punchInLocation;
    if (lat == null || lng == null) return "";

    return buildAttendanceMapHtml(
      { latitude: siteNumbers.latitude, longitude: siteNumbers.longitude },
      siteNumbers.radiusMeters,
      {
        punchIn: { latitude: lat, longitude: lng },
        punchOut:
          punchOutLocation?.lat != null && punchOutLocation?.lng != null
            ? {
                latitude: punchOutLocation.lat,
                longitude: punchOutLocation.lng,
              }
            : null,
      },
    );
  }, [siteNumbers, punchInLocation, punchOutLocation]);

  const loadUserLocation = useCallback(async () => {
    setLocationError("");
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setLocationError("Location permission is required for attendance.");
      setUserLocation(null);
      return;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    setUserLocation({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });
  }, []);

  const handleLocateMe = useCallback(async () => {
    setLocating(true);
    try {
      await loadUserLocation();
      setFocusUser(true);
    } finally {
      setLocating(false);
    }
  }, [loadUserLocation]);

  const loadSiteCoordinates = useCallback(async (siteId: string) => {
    if (!siteId) return;
    setCoordsError("");
    try {
      const coords = await fetchSiteCoordinates(siteId);
      setSiteCoords(coords);
    } catch (err) {
      setSiteCoords(null);
      setCoordsError(
        err instanceof Error ? err.message : "Failed to load site coordinates",
      );
    }
  }, []);

  const loadPunchStatus = useCallback(async () => {
    if (!userId) {
      setPunchStatus({ punchedIn: false, punchedOut: false, data: null });
      return;
    }

    setStatusError("");
    try {
      const status = await fetchPunchStatus(userId);
      setPunchStatus(status);
    } catch (err) {
      setPunchStatus(null);
      setStatusError(
        err instanceof Error ? err.message : "Failed to load punch status",
      );
    }
  }, [userId]);

  const refreshAll = useCallback(async () => {
    if (!selectedSiteId || !userId) return;
    await Promise.all([
      loadUserLocation(),
      loadSiteCoordinates(selectedSiteId),
      loadPunchStatus(),
    ]);
  }, [
    selectedSiteId,
    userId,
    loadUserLocation,
    loadSiteCoordinates,
    loadPunchStatus,
  ]);

  useEffect(() => {
    setSelectedSiteId(assignedSites[0]?.site_id ?? "");
    setPunchStatus(null);
    setSiteCoords(null);
    setStatusError("");
    setCoordsError("");
    setLocationError("");
    setUserLocation(null);
    setPunchMode(null);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (!assignedSites.length) {
      setLoading(false);
      return;
    }

    if (!selectedSiteId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refreshAll();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, assignedSites.length, selectedSiteId, refreshAll]);

  useFocusEffect(
    useCallback(() => {
      if (!userId || !selectedSiteId) return;
      void loadPunchStatus();
    }, [userId, selectedSiteId, loadPunchStatus]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll]);

  const handleSiteSelect = (siteId: string) => {
    setSelectedSiteId(siteId);
    void loadSiteCoordinates(siteId);
  };

  const handlePunchUploaded = useCallback(
    async (imageUrl: string) => {
      if (!userLocation) {
        Alert.alert(
          "Location missing",
          "Could not read your current location.",
        );
        return;
      }

      setSubmitting(true);
      try {
        if (punchMode === "in") {
          const message = await punchIn({
            siteId: selectedSiteId,
            punchInImage: imageUrl,
            lat: userLocation.lat,
            lng: userLocation.lng,
          });
          Alert.alert("Punch In", message);
        } else if (punchMode === "out") {
          const message = await punchOut({
            punchOutImage: imageUrl,
            lat: userLocation.lat,
            lng: userLocation.lng,
          });
          Alert.alert("Punch Out", message);
        }
        await loadPunchStatus();
        await refreshTrackingState();
      } catch (err) {
        Alert.alert(
          "Attendance failed",
          err instanceof Error ? err.message : "Could not complete punch",
        );
      } finally {
        setSubmitting(false);
        setPunchMode(null);
      }
    },
    [userLocation, punchMode, selectedSiteId, loadPunchStatus, refreshTrackingState],
  );

  const selectedSite = assignedSites.find((s) => s.site_id === selectedSiteId);

  return (
    <View style={styles.wrapper}>
      <Navbar title="Attendance" subtitle="Punch in / punch out" />

      <Screen
        scroll
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
          />
        }
      >
        {assignedSites.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="location-outline"
              size={36}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No assigned sites. Ask an admin to assign a site before using
              attendance.
            </Text>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => navigation.navigate("AttendanceHistory")}
              style={[
                styles.historyLink,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text
                style={[styles.historyLinkText, { color: colors.textPrimary }]}
              >
                View attendance history
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Assigned Site
              </Text>
              <View style={styles.siteChips}>
                {assignedSites.map((site) => {
                  const active = site.site_id === selectedSiteId;
                  return (
                    <Pressable
                      key={site.site_id}
                      onPress={() => handleSiteSelect(site.site_id)}
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
                        {site.site_id}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.statusRow}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Your Location
                </Text>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Badge
                    label={isInside ? "Inside site" : "Outside site"}
                    variant={isInside ? "success" : "error"}
                    size="sm"
                  />
                )}
              </View>

              {locationError ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {locationError}
                </Text>
              ) : userLocation ? (
                <Text
                  style={[styles.coordsText, { color: colors.textSecondary }]}
                >
                  {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                  {/* {distanceMeters != null
                    ? ` · ${formatDistance(distanceMeters)} from site`
                    : ""} */}
                </Text>
              ) : (
                <Text style={[styles.coordsText, { color: colors.textMuted }]}>
                  Waiting for GPS...
                </Text>
              )}

              {coordsError ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {coordsError}
                </Text>
              ) : null}

              <View
                style={[
                  styles.mapWrap,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.backgroundTertiary,
                  },
                ]}
              >
                {siteNumbers && mapHtml ? (
                  <>
                    <WebView
                      key={`${selectedSiteId}-${userLocation?.lat}-${userLocation?.lng}-${isDark}-${focusUser ? "focus" : "default"}`}
                      originWhitelist={["*"]}
                      source={{ html: mapHtml }}
                      style={styles.map}
                      scrollEnabled={false}
                      nestedScrollEnabled
                      javaScriptEnabled
                      domStorageEnabled
                    />
                    <MapLocateButton onPress={handleLocateMe} loading={locating} />
                  </>
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <Text
                      style={[styles.coordsText, { color: colors.textMuted }]}
                    >
                      {loading
                        ? "Loading map..."
                        : "Site coordinates unavailable"}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#00C9A7" }]}
                  />
                  <Text
                    style={[styles.legendText, { color: colors.textMuted }]}
                  >
                    Site area
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#4F7CFF" }]}
                  />
                  <Text
                    style={[styles.legendText, { color: colors.textMuted }]}
                  >
                    You
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Today&apos;s Status
              </Text>

              {statusError ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {statusError}
                </Text>
              ) : punchStatus?.data?.punchin_time ? (
                <Text
                  style={[styles.statusLine, { color: colors.textSecondary }]}
                >
                  Punched in: {formatDateTimeIST(punchStatus.data.punchin_time)}
                </Text>
              ) : (
                <Text style={[styles.statusLine, { color: colors.textMuted }]}>
                  Not punched in yet
                </Text>
              )}

              {punchStatus?.data?.punchout_time ? (
                <Text
                  style={[styles.statusLine, { color: colors.textSecondary }]}
                >
                  Punched out:{" "}
                  {formatDateTimeIST(punchStatus.data.punchout_time)}
                </Text>
              ) : null}

              {punchInLocation?.lat != null &&
              punchInLocation?.lng != null &&
              punchStatusMapHtml ? (
                <>
                  {/* <Text
                    style={[styles.coordsText, { color: colors.textSecondary }]}
                  >
                    Punch in: {punchInLocation.lat.toFixed(6)},{" "}
                    {punchInLocation.lng.toFixed(6)}
                  </Text>
                  {punchOutLocation?.lat != null &&
                  punchOutLocation?.lng != null ? (
                    <Text
                      style={[
                        styles.coordsText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Punch out: {punchOutLocation.lat.toFixed(6)},{" "}
                      {punchOutLocation.lng.toFixed(6)}
                    </Text>
                  ) : null} */}
                  <View
                    style={[
                      styles.mapWrap,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.backgroundTertiary,
                      },
                    ]}
                  >
                    <WebView
                      key={`punch-${punchInLocation.lat}-${punchInLocation.lng}-${punchOutLocation?.lat}-${isDark}`}
                      originWhitelist={["*"]}
                      source={{ html: punchStatusMapHtml }}
                      style={styles.map}
                      scrollEnabled={false}
                      nestedScrollEnabled
                      javaScriptEnabled
                      domStorageEnabled
                    />
                  </View>
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: "#00C9A7" },
                        ]}
                      />
                      <Text
                        style={[styles.legendText, { color: colors.textMuted }]}
                      >
                        Site area
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: "#F5A623" },
                        ]}
                      />
                      <Text
                        style={[styles.legendText, { color: colors.textMuted }]}
                      >
                        Punch in
                      </Text>
                    </View>
                    {punchOutLocation?.lat != null &&
                    punchOutLocation?.lng != null ? (
                      <View style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: "#EF4444" },
                          ]}
                        />
                        <Text
                          style={[
                            styles.legendText,
                            { color: colors.textMuted },
                          ]}
                        >
                          Punch out
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {punchInImage || punchOutImage ? (
                    <View style={styles.punchPhotosRow}>
                      {punchInImage ? (
                        <Pressable
                          style={styles.punchPhotoItem}
                          onPress={() => setViewerImage(punchInImage)}
                        >
                          <Image
                            source={{ uri: punchInImage }}
                            style={[
                              styles.punchPhotoThumb,
                              { borderColor: colors.border },
                            ]}
                            resizeMode="cover"
                          />
                          <Text
                            style={[
                              styles.punchPhotoLabel,
                              { color: colors.textMuted },
                            ]}
                          >
                            Punch in photo
                          </Text>
                        </Pressable>
                      ) : null}
                      {punchOutImage ? (
                        <Pressable
                          style={styles.punchPhotoItem}
                          onPress={() => setViewerImage(punchOutImage)}
                        >
                          <Image
                            source={{ uri: punchOutImage }}
                            style={[
                              styles.punchPhotoThumb,
                              { borderColor: colors.border },
                            ]}
                            resizeMode="cover"
                          />
                          <Text
                            style={[
                              styles.punchPhotoLabel,
                              { color: colors.textMuted },
                            ]}
                          >
                            Punch out photo
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </>
              ) : null}

              <View style={styles.actionRow}>
                {punchCompleteToday ? (
                  <View style={styles.completedBadge}>
                    <Badge
                      label="You have already punched in and out for today."
                      variant="success"
                    />
                  </View>
                ) : showPunchOut ? (
                  <Button
                    title="Punch Out"
                    variant="danger"
                    icon="log-out-outline"
                    onPress={() => setPunchMode("out")}
                    disabled={
                      !isInside || !userLocation || submitting || loading
                    }
                    loading={submitting}
                    fullWidth
                  />
                ) : (
                  <Button
                    title="Punch In"
                    icon="log-in-outline"
                    onPress={() => setPunchMode("in")}
                    disabled={
                      !isInside || !userLocation || submitting || loading
                    }
                    loading={submitting}
                    fullWidth
                  />
                )}
              </View>

              {!punchCompleteToday &&
              !isInside &&
              userLocation &&
              siteNumbers ? (
                <Text style={[styles.hintText, { color: colors.textMuted }]}>
                  Move inside the site area ({siteNumbers.radiusMeters} m
                  radius) to punch.
                </Text>
              ) : null}
            </View>
          </>
        )}
      </Screen>

      <PunchCaptureModal
        visible={punchMode !== null}
        title={punchMode === "out" ? "Punch Out Photo" : "Punch In Photo"}
        onClose={() => setPunchMode(null)}
        onUploaded={handlePunchUploaded}
      />

      <Modal
        visible={viewerImage != null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImage(null)}
      >
        <Pressable
          style={styles.viewerBackdrop}
          onPress={() => setViewerImage(null)}
        >
          {viewerImage ? (
            <Image
              source={{ uri: viewerImage }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  historyLink: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  historyLinkText: {
    ...typography.bodySmall,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  card: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: "700",
  },
  siteChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  siteChip: {
    maxWidth: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  siteChipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "600",
  },
  siteMeta: {
    ...typography.caption,
    fontSize: 11,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  coordsText: {
    ...typography.caption,
    fontSize: 11,
  },
  errorText: {
    ...typography.caption,
    fontSize: 11,
  },
  mapWrap: {
    height: 240,
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: spacing.xs,
    position: "relative",
  },
  map: {
    flex: 1,
    backgroundColor: "transparent",
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  legendRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.caption,
    fontSize: 10,
  },
  statusLine: {
    ...typography.bodySmall,
    fontSize: 12,
  },
  actionRow: {
    marginTop: spacing.sm,
  },
  completedBadge: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },
  hintText: {
    ...typography.caption,
    fontSize: 11,
    textAlign: "center",
  },
  punchPhotosRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  punchPhotoItem: {
    alignItems: "center",
    gap: spacing.xs,
  },
  punchPhotoThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: "#1a1a1a",
  },
  punchPhotoLabel: {
    ...typography.caption,
    fontSize: 10,
    textAlign: "center",
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  viewerImage: {
    width: "100%",
    height: "80%",
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: "center",
  },
});
