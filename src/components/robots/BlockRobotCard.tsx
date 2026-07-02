import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BlockSummary } from '../../types/blockWiseRobots';
import { Button } from '../ui/Button';
import { RobotTile } from './RobotTile';

const PREVIEW_COUNT = 15;

type Props = {
  block: BlockSummary;
};

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.statItem}>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

export function BlockRobotCard({ block }: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const visibleRobots = useMemo(() => {
    if (expanded) return block.blockrobots;
    return block.blockrobots.slice(0, PREVIEW_COUNT);
  }, [block.blockrobots, expanded]);

  const hiddenCount = block.blockrobots.length - visibleRobots.length;
  const blockTitle = block.block_name?.startsWith('Block')
    ? block.block_name
    : `Block-${block.block_name}`;

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
      <Text style={[styles.blockTitle, { color: colors.primary }]}>{blockTitle}</Text>

      <View style={styles.statsRow}>
        <StatItem label="Total" value={block.total_robot_count} color="#4F7CFF" />
        <StatItem label="Online" value={block.online} color={colors.primary} />
        <StatItem label="Running" value={block.running} color="#F59E0B" />
        <StatItem label="Offline" value={block.offline} color={colors.danger} />
      </View>

      <View style={styles.grid}>
        {visibleRobots.map((robot) => (
          <RobotTile key={robot.robot_no} robot={robot} />
        ))}
      </View>

      {hiddenCount > 0 ? (
        <Pressable onPress={() => setExpanded(true)} style={styles.moreWrap}>
          <Text style={[styles.moreText, { color: colors.primary }]}>
            +{hiddenCount} more robots
          </Text>
        </Pressable>
      ) : expanded && block.blockrobots.length > PREVIEW_COUNT ? (
        <Pressable onPress={() => setExpanded(false)} style={styles.moreWrap}>
          <Text style={[styles.moreText, { color: colors.textMuted }]}>Show less</Text>
        </Pressable>
      ) : null}

      <Button title="MANAGE" onPress={() => {}} size="sm" fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  blockTitle: {
    ...typography.h3,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  statValue: {
    ...typography.h3,
    fontSize: 18,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: spacing.xs,
  },
  moreWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  moreText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
