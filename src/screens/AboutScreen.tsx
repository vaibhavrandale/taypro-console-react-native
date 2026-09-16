import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { Navbar, Screen } from "../components/layout";
import { Logo } from "../components/ui";
import { useTheme } from "../theme";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

/** Update this when you cut a release. */
const RELEASE_DATE = "1 Sep 2026";

const LATEST_FEATURES: { title: string; items: string[] }[] = [
  {
    title: "Notifications",
    items: [
      "System tray / lock-screen alerts for announcements",
      "System tray alerts for timer execution",
      "Tap a system notification to open the acknowledge screen",
      "Notifications item in the sidebar, with unread badge",
      "Notifications screen listing unread alerts",
    ],
  },
  {
    title: "Attendance",
    items: [
      "WFH checkbox and reason on punch-in",
      "Submit WFH request (pending / approved)",
      "WFH badge on attendance history",
      "Location tracking stays off for WFH",
    ],
  },
  {
    title: "Cleaning logs",
    items: [
      "Download logs as PDF",
      "Serial number column",
      "Full status text",
      "Highlight duplicate robot numbers",
    ],
  },
  {
    title: "Other",
    items: ["Dock-return spin direction fix on robot tracking"],
  },
];

function appVersion() {
  const expoVersion = Constants.expoConfig?.version ?? "1.0.0";
  const native = Constants.nativeAppVersion;
  const build = Constants.nativeBuildVersion;
  if (native && native !== expoVersion) {
    return build ? `${native} (${expoVersion}) · build ${build}` : native;
  }
  return build ? `${expoVersion} · build ${build}` : expoVersion;
}

export function AboutScreen() {
  const { colors } = useTheme();
  const version = appVersion();

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Navbar title="About" subtitle="App version and release notes" />
      <Screen scroll>
        <View
          style={[
            styles.hero,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Logo size="xxxl" rounded={false} style={styles.logo} />
          <Text style={[styles.appName, { color: colors.textPrimary }]}>
            Nectyr
          </Text>
        </View>

        <View
          style={[
            styles.metaCard,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              APK version
            </Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
              {version}
            </Text>
          </View>
          <View
            style={[styles.metaDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              Release date
            </Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
              {RELEASE_DATE}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Latest features
        </Text>

        {LATEST_FEATURES.map((group) => (
          <View
            key={group.title}
            style={[
              styles.featureCard,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.featureGroup, { color: colors.textPrimary }]}
            >
              {group.title}
            </Text>
            {group.items.map((item) => (
              <View key={item} style={styles.featureRow}>
                <Text style={[styles.bullet, { color: colors.primary }]}>
                  •
                </Text>
                <Text
                  style={[styles.featureItem, { color: colors.textSecondary }]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  hero: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: spacing.xs,
  },
  logo: {
    width: "100%",
    height: 72,
  },
  appName: {
    ...typography.h2,
  },
  metaCard: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  metaRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  metaDivider: {
    height: StyleSheet.hairlineWidth,
  },
  metaLabel: {
    ...typography.caption,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  metaValue: {
    ...typography.label,
    fontSize: 14,
  },
  sectionTitle: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  featureCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  featureGroup: {
    ...typography.label,
    fontSize: 13,
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  bullet: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  featureItem: {
    ...typography.bodySmall,
    flex: 1,
    lineHeight: 18,
  },
});
