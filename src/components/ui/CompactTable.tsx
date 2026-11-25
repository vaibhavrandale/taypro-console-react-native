import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, BadgeVariant } from './Badge';
import { useTheme } from '../../theme';
import { typography } from '../../theme/typography';

const GAP = 2;
const PAD = 4;

export function tableWidth(widths: number[]) {
  return widths.reduce((sum, width) => sum + width, 0) + (widths.length - 1) * GAP + PAD;
}

export function TableHeader({
  columns,
}: {
  columns: { label: string; width: number }[];
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.header,
        {
          width: tableWidth(columns.map((column) => column.width)),
          backgroundColor: colors.backgroundTertiary,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {columns.map((column) => (
        <Text
          key={column.label}
          style={[styles.headerCell, { width: column.width, color: colors.textMuted }]}
        >
          {column.label}
        </Text>
      ))}
    </View>
  );
}

export function TableRow({
  width,
  children,
  onPress,
}: {
  width: number;
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const row = (
    <View style={[styles.row, { width, borderBottomColor: colors.border }]}>
      {children}
    </View>
  );
  if (!onPress) return row;
  return <Pressable onPress={onPress}>{row}</Pressable>;
}

export function TableCell({
  width,
  children,
  bold,
  color,
  wrap,
}: {
  width: number;
  children: React.ReactNode;
  bold?: boolean;
  color?: string;
  wrap?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        styles.cell,
        bold && styles.cellBold,
        { width, color: color ?? (bold ? colors.textPrimary : colors.textSecondary) },
      ]}
      {...(wrap ? {} : { numberOfLines: 1 })}
    >
      {children}
    </Text>
  );
}

export function TableBadge({
  width,
  label,
  variant,
}: {
  width: number;
  label: string;
  variant: BadgeVariant;
}) {
  return (
    <View style={{ width, alignItems: 'center' }}>
      <Badge label={label} variant={variant} size="sm" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: GAP,
  },
  headerCell: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    lineHeight: 13,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: GAP,
  },
  cell: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  cellBold: {
    fontWeight: '700',
  },
});
