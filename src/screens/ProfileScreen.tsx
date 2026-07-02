import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Navbar, Screen } from '../components/layout';
import { Badge, Logo } from '../components/ui';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { User } from '../types/auth';

function getServerRoot() {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

function getProfileImageUri(path?: string) {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${getServerRoot()}${path.startsWith('/') ? path : `/${path}`}`;
}

function formatRole(role: string) {
  return role
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.backgroundTertiary }]}>
        <Ionicons name={icon} size={14} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}

function buildInfoRows(user: User) {
  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'mail-outline', label: 'Email', value: user.email },
    { icon: 'shield-checkmark-outline', label: 'Role', value: formatRole(user.role) },
  ];

  if (user.department) {
    rows.push({ icon: 'business-outline', label: 'Department', value: user.department });
  }
  if (user.designation) {
    rows.push({ icon: 'briefcase-outline', label: 'Designation', value: user.designation });
  }
  if (user.employee_id) {
    rows.push({ icon: 'id-card-outline', label: 'Employee ID', value: user.employee_id });
  }
  if (user.phone) {
    rows.push({ icon: 'call-outline', label: 'Phone', value: user.phone });
  }
  if (user.type) {
    rows.push({ icon: 'layers-outline', label: 'Account Type', value: formatRole(user.type) });
  }

  return rows;
}

export function ProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

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
  const infoRows = buildInfoRows(user);

  return (
    <View style={styles.wrapper}>
      <Navbar title="Profile" subtitle="Your account" />

      <Screen scroll>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.backgroundTertiary }]}>
                <Logo size="lg" rounded />
              </View>
            )}
          </View>

          <Text style={[styles.name, { color: colors.textPrimary }]}>{user.username}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>

          <View style={styles.badgeRow}>
            <Badge label={formatRole(user.role)} variant="info" />
            {user.robot_command_access ? (
              <Badge label="Robot Commands" variant="success" />
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Account Details
          </Text>
          {infoRows.map((row) => (
            <InfoRow key={row.label} icon={row.icon} label={row.label} value={row.value} />
          ))}
        </View>

        <View
          style={[
            styles.metaCard,
            {
              backgroundColor: colors.backgroundTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            Signed in as {user.username}. Profile data is loaded from your login session.
          </Text>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  heroCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  avatarRing: {
    borderWidth: 1.5,
    borderRadius: 36,
    padding: 2,
    marginBottom: spacing.sm,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  name: {
    ...typography.h3,
    textAlign: 'center',
  },
  email: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  metaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  metaText: {
    ...typography.caption,
    flex: 1,
    lineHeight: 18,
  },
});
