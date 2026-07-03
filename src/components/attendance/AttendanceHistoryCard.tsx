import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { buildPunchRecordMapHtml } from "./attendanceMapHtml";
import { Badge } from "../ui";
import { useTheme } from "../../theme";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { AttendanceRecord } from "../../types/attendance";
import { formatDateIST, formatDateTimeIST } from "../../utils/datetime";

type Props = {
  record: AttendanceRecord;
  isDark: boolean;
  onImagePress: (uri: string) => void;
};

export function AttendanceHistoryCard({ record, isDark, onImagePress }: Props) {
  const { colors } = useTheme();

  const punchIn = record.punchin_location;
  const punchOut = record.punchout_location;
  const hasMap =
    (punchIn?.lat != null && punchIn?.lng != null) ||
    (punchOut?.lat != null && punchOut?.lng != null);

  const mapHtml = useMemo(() => {
    if (!hasMap) return "";
    return buildPunchRecordMapHtml({
      punchIn:
        punchIn?.lat != null && punchIn?.lng != null
          ? { latitude: punchIn.lat, longitude: punchIn.lng }
          : null,
      punchOut:
        punchOut?.lat != null && punchOut?.lng != null
          ? { latitude: punchOut.lat, longitude: punchOut.lng }
          : null,
    });
  }, [hasMap, punchIn, punchOut]);

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
      <View style={styles.headerRow}>
        <Text style={[styles.dateText, { color: colors.textPrimary }]}>
          {formatDateIST(record.punchin_time)}
        </Text>
        <Badge label={record.site_id} variant="info" size="sm" />
      </View>

      {record.punchin_time ? (
        <Text style={[styles.line, { color: colors.textSecondary }]}>
          Punch in: {formatDateTimeIST(record.punchin_time)}
        </Text>
      ) : null}

      {record.punchout_time ? (
        <Text style={[styles.line, { color: colors.textSecondary }]}>
          Punch out: {formatDateTimeIST(record.punchout_time)}
        </Text>
      ) : (
        <Text style={[styles.line, { color: colors.textMuted }]}>
          Punch out: Not recorded
        </Text>
      )}

      {/* {punchIn?.lat != null && punchIn?.lng != null ? (
        <Text style={[styles.coords, { color: colors.textMuted }]}>
          In: {punchIn.lat.toFixed(6)}, {punchIn.lng.toFixed(6)}
        </Text>
      ) : null}

      {punchOut?.lat != null && punchOut?.lng != null ? (
        <Text style={[styles.coords, { color: colors.textMuted }]}>
          Out: {punchOut.lat.toFixed(6)}, {punchOut.lng.toFixed(6)}
        </Text>
      ) : null} */}

      {hasMap && mapHtml ? (
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
            key={`${record._id}-${isDark}`}
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            style={styles.map}
            scrollEnabled={false}
            nestedScrollEnabled
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
      ) : null}

      {record.punch_in_image || record.punch_out_image ? (
        <View style={styles.photosRow}>
          {record.punch_in_image ? (
            <Pressable
              style={styles.photoItem}
              onPress={() => onImagePress(record.punch_in_image!)}
            >
              <Image
                source={{ uri: record.punch_in_image }}
                style={[styles.photo, { borderColor: colors.border }]}
                resizeMode="cover"
              />
              <Text style={[styles.photoLabel, { color: colors.textMuted }]}>
                Punch in
              </Text>
            </Pressable>
          ) : null}
          {record.punch_out_image ? (
            <Pressable
              style={styles.photoItem}
              onPress={() => onImagePress(record.punch_out_image!)}
            >
              <Image
                source={{ uri: record.punch_out_image }}
                style={[styles.photo, { borderColor: colors.border }]}
                resizeMode="cover"
              />
              <Text style={[styles.photoLabel, { color: colors.textMuted }]}>
                Punch out
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  dateText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  line: {
    ...typography.bodySmall,
    fontSize: 12,
  },
  coords: {
    ...typography.caption,
    fontSize: 11,
  },
  mapWrap: {
    height: 200,
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  map: {
    flex: 1,
    backgroundColor: "transparent",
  },
  photosRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  photoItem: {
    alignItems: "center",
    gap: spacing.xs,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: "#1a1a1a",
  },
  photoLabel: {
    ...typography.caption,
    fontSize: 10,
  },
});
