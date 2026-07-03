import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Navbar, Screen } from "../components/layout";
import { ProfileCameraModal } from "../components/profile/ProfileCameraModal";
import { useStatusBarOverlay } from "../context/StatusBarOverlayContext";
import { Badge, Button, Logo } from "../components/ui";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import type { AssignedSite, User } from "../types/auth";
import { formatDateTimeIST } from "../utils/datetime";

function getServerRoot() {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, "");
}

function getProfileImageUri(path?: string) {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${getServerRoot()}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatRole(role: string) {
  return role
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatCreatedDate(value?: string) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function canCapturePhotos(role: string) {
  return role === "Site Technician" || role === "Master Admin";
}

function buildDetailRows(user: User) {
  const isInternal = user.type?.toLowerCase() === "internal";
  const rows: { label: string; value: string }[] = [
    { label: "Name", value: user.username },
    { label: "Role", value: formatRole(user.role) },
    { label: "Email", value: user.email },
    { label: "User ID", value: user._id },
    { label: "Created", value: formatCreatedDate(user.createdAt) },
  ];

  if (isInternal) {
    if (user.salutation) rows.push({ label: "Salutation", value: user.salutation });
    if (user.department) rows.push({ label: "Department", value: user.department });
    if (user.designation) rows.push({ label: "Designation", value: user.designation });
    if (user.phone) rows.push({ label: "Phone", value: user.phone });
    if (user.employee_id) rows.push({ label: "Employee ID", value: user.employee_id });
    rows.push({
      label: "Last Login",
      value: user.last_login ? formatDateTimeIST(user.last_login) : "N/A",
    });
  }

  return rows;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.textPrimary }]} numberOfLines={3}>
        {value || "N/A"}
      </Text>
    </View>
  );
}

function AssignedSiteRow({ site }: { site: AssignedSite }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.siteRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.siteIcon, { backgroundColor: colors.backgroundTertiary }]}>
        <Ionicons name="business-outline" size={14} color={colors.primary} />
      </View>
      <View style={styles.siteContent}>
        <Text style={[styles.siteName, { color: colors.textPrimary }]} numberOfLines={1}>
          {site.siteName || site.site_id}
        </Text>
        <Text style={[styles.siteId, { color: colors.textMuted }]} numberOfLines={1}>
          {site.site_id}
        </Text>
      </View>
    </View>
  );
}

const GRID_COLUMNS = 3;
const GRID_GAP = spacing.xs;
const GRID_TILE_MAX = 72;

function UserImagesSection({
  images,
  onOpen,
}: {
  images: string[];
  onOpen: (index: number) => void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const availableWidth = width - spacing.lg * 2 - spacing.md * 2;
  const tileSize = Math.min(
    (availableWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
    GRID_TILE_MAX,
  );

  return (
    <View style={styles.imageGrid}>
      {images.map((uri, index) => (
        <Pressable
          key={`${uri}-${index}`}
          onPress={() => onOpen(index)}
          style={({ pressed }) => [
            styles.imageTile,
            {
              width: tileSize,
              height: tileSize,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Image source={{ uri }} style={styles.imageThumb} resizeMode="cover" />
        </Pressable>
      ))}
    </View>
  );
}

function ImageViewerModal({
  images,
  index,
  onClose,
  onChangeIndex,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onChangeIndex: (next: number) => void;
}) {
  const { width, height } = useWindowDimensions();
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  useStatusBarOverlay(true);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewerBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.viewerHeader}>
          <Text style={styles.viewerCounter}>
            {index + 1} / {images.length}
          </Text>
          <Pressable onPress={onClose} style={styles.viewerCloseButton} hitSlop={12}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={[styles.viewerContent, { width, height: height * 0.72 }]}>
          <Image
            source={{ uri: images[index] }}
            style={styles.viewerImage}
            resizeMode="contain"
          />

          {images.length > 1 ? (
            <>
              <Pressable
                onPress={() => hasPrev && onChangeIndex(index - 1)}
                disabled={!hasPrev}
                style={[
                  styles.viewerNavButton,
                  styles.viewerNavButtonLeft,
                  { opacity: hasPrev ? 1 : 0.35 },
                ]}
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => hasNext && onChangeIndex(index + 1)}
                disabled={!hasNext}
                style={[
                  styles.viewerNavButton,
                  styles.viewerNavButtonRight,
                  { opacity: hasNext ? 1 : 0.35 },
                ]}
              >
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {hint ? (
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
      {children}
    </View>
  );
}

export function ProfileScreen() {
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError("");
    try {
      await refreshUser();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to refresh profile");
    } finally {
      setProfileLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    if (!user?._id) return;

    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      setProfileError("");
      try {
        await refreshUser();
      } catch (err) {
        if (!cancelled) {
          setProfileError(err instanceof Error ? err.message : "Failed to refresh profile");
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?._id, refreshUser]);

  const assignedSites = useMemo(
    () => (user?.assigned_sites ?? []).filter((site) => site.site_id),
    [user?.assigned_sites],
  );

  const userImages = useMemo(
    () =>
      (user?.user_images ?? [])
        .map((path) => getProfileImageUri(path))
        .filter((uri): uri is string => Boolean(uri)),
    [user?.user_images],
  );

  if (!user) {
    return (
      <View style={styles.wrapper}>
        <Navbar title="Profile" showMenu={false} />
        <Screen>
          <Text style={{ color: colors.textSecondary }}>No user data available.</Text>
        </Screen>
      </View>
    );
  }

  const imageUri = getProfileImageUri(user.profile_image);
  const detailRows = buildDetailRows(user);
  const showCapture = canCapturePhotos(user.role);

  return (
    <View style={styles.wrapper}>
      <Navbar title="Profile" subtitle="Your account" />

      <Screen scroll>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.summaryHeader, { backgroundColor: colors.primary }]}>
            <Text style={styles.summaryHeaderText}>Profile Summary</Text>
          </View>

          <View style={styles.summaryBody}>
            <View style={[styles.avatarWrap, { borderColor: colors.border }]}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: colors.backgroundTertiary },
                  ]}
                >
                  <Logo size="lg" rounded />
                </View>
              )}
            </View>

            <View style={styles.summaryInfo}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{user.username}</Text>
              <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>
              <View style={styles.badgeRow}>
                <Badge label={formatRole(user.role)} variant="info" />
                {user.type ? (
                  <Badge label={formatRole(user.type)} variant="neutral" size="sm" />
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.detailsBlock}>
            {detailRows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </View>
        </View>

        {assignedSites.length > 0 ? (
          <SectionCard
            title="Assigned Sites"
            hint={`${assignedSites.length} site${assignedSites.length === 1 ? "" : "s"}`}
          >
            {assignedSites.map((site) => (
              <AssignedSiteRow key={site.site_id} site={site} />
            ))}
          </SectionCard>
        ) : null}

        {userImages.length > 0 ? (
          <SectionCard
            title="Profile Photos"
            hint={`${userImages.length} image${userImages.length === 1 ? "" : "s"} · Tap to view`}
          >
            <UserImagesSection images={userImages} onOpen={setViewerIndex} />
          </SectionCard>
        ) : null}

        {showCapture ? (
          <SectionCard
            title="Capture Self Profile Photos"
            hint="Take a clear photo against a white background"
          >
            {profileLoading ? (
              <View style={styles.captureState}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.captureHint, { color: colors.textMuted }]}>
                  Loading profile...
                </Text>
              </View>
            ) : profileError ? (
              <View style={styles.captureState}>
                <Text style={[styles.captureError, { color: colors.danger }]}>
                  {profileError}
                </Text>
                <Button title="Retry" size="sm" onPress={() => void loadProfile()} />
              </View>
            ) : (
              <View style={styles.captureState}>
                <Ionicons name="camera-outline" size={32} color={colors.primary} />
                <Text style={[styles.captureHint, { color: colors.textMuted }]}>
                  {userImages.length > 0
                    ? `You have ${userImages.length} saved image${userImages.length === 1 ? "" : "s"}`
                    : "No profile photos yet"}
                </Text>
                <Button
                  title="Open Camera"
                  size="sm"
                  icon="camera-outline"
                  onPress={() => setShowCamera(true)}
                />
              </View>
            )}
          </SectionCard>
        ) : null}
      </Screen>

      {viewerIndex !== null ? (
        <ImageViewerModal
          images={userImages}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onChangeIndex={setViewerIndex}
        />
      ) : null}

      <ProfileCameraModal
        visible={showCamera}
        userId={user._id}
        onClose={() => setShowCamera(false)}
        onSaved={loadProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  summaryCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  summaryHeader: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  summaryHeaderText: {
    ...typography.label,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#101936",
  },
  summaryBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...typography.h3,
    fontSize: 18,
  },
  email: {
    ...typography.bodySmall,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  detailsBlock: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    ...typography.caption,
    width: 100,
    fontWeight: "600",
  },
  detailValue: {
    ...typography.bodySmall,
    flex: 1,
    fontWeight: "500",
  },
  sectionCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 15,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  siteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  siteIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  siteContent: {
    flex: 1,
    gap: 2,
  },
  siteName: {
    ...typography.bodySmall,
    fontWeight: "600",
  },
  siteId: {
    ...typography.caption,
    fontSize: 11,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    paddingBottom: spacing.xs,
    alignContent: "flex-start",
  },
  imageTile: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  imageThumb: {
    width: "100%",
    height: "100%",
  },
  captureState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  captureHint: {
    ...typography.bodySmall,
    textAlign: "center",
  },
  captureError: {
    ...typography.bodySmall,
    textAlign: "center",
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerHeader: {
    position: "absolute",
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  viewerCounter: {
    ...typography.label,
    color: "#fff",
    fontSize: 14,
  },
  viewerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  viewerContent: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
  viewerNavButton: {
    position: "absolute",
    top: "50%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  viewerNavButtonLeft: {
    left: spacing.xs,
  },
  viewerNavButtonRight: {
    right: spacing.xs,
  },
});
