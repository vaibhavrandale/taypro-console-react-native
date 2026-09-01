import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { ThemeColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  CLEANING_LOG_TABLE_WIDTH,
  CleaningLogCategory,
  CleaningLogRecord,
  DPR_TABLE_WIDTH,
  DprRecord,
  NOT_STARTED_TABLE_WIDTH,
  OFFLINE_LOG_TABLE_WIDTH,
  NotStartedRobot,
  OfflineRobotLog,
} from '../../types/cleaningLogs';
import {
  formatDprDate,
  formatLogDateTime,
  formatOnlineStatus,
  formatOperationalValue,
  getCleaningNote,
  getCleaningPercentage,
  getDprTechnician,
  resolveProfileImageUri,
} from '../../utils/cleaningLogs';

type CleaningRow = CleaningLogRecord | NotStartedRobot | OfflineRobotLog | DprRecord;

type Props = {
  item: CleaningRow;
  index: number;
  category: CleaningLogCategory;
  /** When true, robot_no appears more than once in this table. */
  highlightRobotNo?: boolean;
};

function robotBadgeTone(
  category: CleaningLogCategory,
): keyof ThemeColors['badge'] {
  if (category === 'completed') return 'success';
  if (category === 'inprogress') return 'warning';
  if (category === 'failure') return 'error';
  if (category === 'not_started') return 'info';
  if (category === 'offline') return 'neutral';
  return 'neutral';
}

function isCleaningLog(item: CleaningRow): item is CleaningLogRecord {
  return 'cleaning' in item || ('comments' in item && 'row_length' in item);
}

function isNotStarted(item: CleaningRow): item is NotStartedRobot {
  return 'last_uplink' in item && !('error_type' in item) && !('technician_present' in item);
}

function isDprRecord(item: CleaningRow): item is DprRecord {
  return (
    'last_activity' in item ||
    'technician_present' in item ||
    ('site_id' in item && 'report_date' in item)
  );
}

function Cell({
  width,
  children,
  colors,
  bold,
  numberOfLines = 2,
  fullText = false,
  highlight = false,
  highlightTone = 'error',
}: {
  width: number;
  children: React.ReactNode;
  colors: ThemeColors;
  bold?: boolean;
  numberOfLines?: number;
  /** When true, show the full string with no line clamp. */
  fullText?: boolean;
  /** Duplicate robot_no highlight. */
  highlight?: boolean;
  highlightTone?: keyof ThemeColors['badge'];
}) {
  const badge = colors.badge[highlightTone];
  return (
    <Text
      style={[
        styles.cell,
        bold && styles.cellBold,
        highlight && styles.cellHighlight,
        {
          width,
          color: highlight
            ? badge.text
            : bold
              ? colors.textPrimary
              : colors.textSecondary,
          backgroundColor: highlight ? badge.bg : undefined,
        },
      ]}
      {...(fullText ? {} : { numberOfLines })}
    >
      {children}
    </Text>
  );
}

function HeaderCell({
  width,
  label,
  colors,
}: {
  width: number;
  label: string;
  colors: ThemeColors;
}) {
  return (
    <Text style={[styles.headerCell, { width, color: colors.textMuted }]}>
      {label}
    </Text>
  );
}

function RowShell({
  width,
  children,
  colors,
}: {
  width: number;
  children: React.ReactNode;
  colors: ThemeColors;
}) {
  return (
    <View
      style={[
        styles.row,
        {
          width,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {children}
    </View>
  );
}

function HeaderShell({
  width,
  children,
  colors,
}: {
  width: number;
  children: React.ReactNode;
  colors: ThemeColors;
}) {
  return (
    <View
      style={[
        styles.header,
        {
          width,
          backgroundColor: colors.backgroundTertiary,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {children}
    </View>
  );
}

const cleaningWidths = {
  sr: 34,
  robot: 108,
  status: 240,
  block: 84,
  rowNo: 72,
  rowLength: 92,
  percentage: 88,
  startedAt: 108,
  finishedAt: 108,
  batteryStart: 88,
  batteryEnd: 92,
};

const dprWidths = {
  technician: 200,
  time: 108,
  remarks: 220,
  site: 92,
  ready: 52,
  online: 52,
  manual: 52,
  unop: 52,
  uptime: 52,
};

function TechnicianCell({
  width,
  record,
  colors,
}: {
  width: number;
  record: DprRecord;
  colors: ThemeColors;
}) {
  const technician = getDprTechnician(record);
  const imageUri = resolveProfileImageUri(technician?.profile_image);
  const name = technician?.name ?? '—';
  const email = technician?.email;

  return (
    <View style={[styles.technicianCell, { width }]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.technicianAvatar} />
      ) : (
        <View
          style={[
            styles.technicianAvatar,
            styles.technicianAvatarFallback,
            { backgroundColor: colors.backgroundTertiary },
          ]}
        >
          <Ionicons name="person" size={14} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.technicianText}>
        <Text
          style={[styles.technicianName, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        {email ? (
          <Text
            style={[styles.technicianEmail, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {email}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function CleaningLogTableRow({
  item,
  index,
  category,
  highlightRobotNo = false,
}: Props) {
  const { colors } = useTheme();
  const robotTone = robotBadgeTone(category);

  if (category === 'dpr' && isDprRecord(item)) {
    const ops = item.robots_operational_details;

    return (
      <RowShell width={DPR_TABLE_WIDTH} colors={colors}>
        <TechnicianCell
          width={dprWidths.technician}
          record={item}
          colors={colors}
        />
        <Cell width={dprWidths.time} colors={colors}>
          {formatDprDate(item)}
        </Cell>
        <Cell width={dprWidths.remarks} colors={colors}>
          {item.comments || '—'}
        </Cell>
        <Cell width={dprWidths.site} colors={colors} bold>
          {item.site_id || '—'}
        </Cell>
        <Cell width={dprWidths.ready} colors={colors}>
          {formatOperationalValue(ops?.ready_for_operational)}
        </Cell>
        <Cell width={dprWidths.online} colors={colors}>
          {formatOperationalValue(ops?.online_operational)}
        </Cell>
        <Cell width={dprWidths.manual} colors={colors}>
          {formatOperationalValue(ops?.manual_operational)}
        </Cell>
        <Cell width={dprWidths.unop} colors={colors}>
          {formatOperationalValue(ops?.unoperational)}
        </Cell>
        <Cell width={dprWidths.uptime} colors={colors}>
          {formatOperationalValue(ops?.robots_uptime)}
        </Cell>
      </RowShell>
    );
  }

  if (category === 'offline' && 'error_type' in item) {
    const offline = item as OfflineRobotLog;
    return (
      <RowShell width={OFFLINE_LOG_TABLE_WIDTH} colors={colors}>
        <Cell
          width={108}
          colors={colors}
          bold
          highlight={highlightRobotNo}
          highlightTone={robotTone}
        >
          {offline.robot_no || '—'}
        </Cell>
        <Cell width={84} colors={colors}>
          {offline.block || '—'}
        </Cell>
        <Cell width={120} colors={colors}>
          {formatLogDateTime(offline.createdAt)}
        </Cell>
        <Cell width={96} colors={colors}>
          {offline.error_type || 'offline'}
        </Cell>
      </RowShell>
    );
  }

  if (category === 'not_started' && isNotStarted(item)) {
    return (
      <RowShell width={NOT_STARTED_TABLE_WIDTH} colors={colors}>
        <Cell
          width={108}
          colors={colors}
          bold
          highlight={highlightRobotNo}
          highlightTone={robotTone}
        >
          {item.robot_no || '—'}
        </Cell>
        <Cell width={84} colors={colors}>
          {item.block || '—'}
        </Cell>
        <Cell width={96} colors={colors}>
          {formatOnlineStatus(item.lora_state)}
        </Cell>
        <Cell width={140} colors={colors}>
          {formatLogDateTime(item.last_uplink)}
        </Cell>
      </RowShell>
    );
  }

  if (!isCleaningLog(item)) return null;

  const cleaning = item.cleaning;

  return (
    <RowShell width={CLEANING_LOG_TABLE_WIDTH} colors={colors}>
      <Cell width={cleaningWidths.sr} colors={colors}>
        {index}
      </Cell>
      <Cell
        width={cleaningWidths.robot}
        colors={colors}
        bold
        highlight={highlightRobotNo}
        highlightTone={robotTone}
      >
        {item.robot_no || '—'}
      </Cell>
      <Cell width={cleaningWidths.status} colors={colors} fullText>
        {getCleaningNote(item)}
      </Cell>
      <Cell width={cleaningWidths.block} colors={colors}>
        {item.block || '—'}
      </Cell>
      <Cell width={cleaningWidths.rowNo} colors={colors}>
        {item.row_no ?? '—'}
      </Cell>
      <Cell width={cleaningWidths.rowLength} colors={colors}>
        {item.row_length ?? '—'}
      </Cell>
      <Cell width={cleaningWidths.percentage} colors={colors}>
        {getCleaningPercentage(item)}
      </Cell>
      <Cell width={cleaningWidths.startedAt} colors={colors}>
        {formatLogDateTime(cleaning?.startAt)}
      </Cell>
      <Cell width={cleaningWidths.finishedAt} colors={colors}>
        {formatLogDateTime(cleaning?.finishAt)}
      </Cell>
      <Cell width={cleaningWidths.batteryStart} colors={colors}>
        {cleaning?.battery_before_cleaning != null
          ? `${cleaning.battery_before_cleaning}%`
          : '—'}
      </Cell>
      <Cell width={cleaningWidths.batteryEnd} colors={colors}>
        {cleaning?.battery_after_cleaning != null
          ? `${cleaning.battery_after_cleaning}%`
          : '—'}
      </Cell>
    </RowShell>
  );
}

export function CleaningLogTableHeader({
  category,
}: {
  category: CleaningLogCategory;
}) {
  const { colors } = useTheme();

  if (category === 'dpr') {
    return (
      <HeaderShell width={DPR_TABLE_WIDTH} colors={colors}>
        <HeaderCell width={dprWidths.technician} label="Technician" colors={colors} />
        <HeaderCell width={dprWidths.time} label="Time" colors={colors} />
        <HeaderCell width={dprWidths.remarks} label="Remarks" colors={colors} />
        <HeaderCell width={dprWidths.site} label="Site" colors={colors} />
        <HeaderCell width={dprWidths.ready} label="Ready" colors={colors} />
        <HeaderCell width={dprWidths.online} label="Online" colors={colors} />
        <HeaderCell width={dprWidths.manual} label="Manual" colors={colors} />
        <HeaderCell width={dprWidths.unop} label="Unop" colors={colors} />
        <HeaderCell width={dprWidths.uptime} label="Uptime" colors={colors} />
      </HeaderShell>
    );
  }

  if (category === 'offline') {
    return (
      <HeaderShell width={OFFLINE_LOG_TABLE_WIDTH} colors={colors}>
        <HeaderCell width={108} label="Robot No" colors={colors} />
        <HeaderCell width={84} label="Block" colors={colors} />
        <HeaderCell width={120} label="Time At" colors={colors} />
        <HeaderCell width={96} label="Error Type" colors={colors} />
      </HeaderShell>
    );
  }

  if (category === 'not_started') {
    return (
      <HeaderShell width={NOT_STARTED_TABLE_WIDTH} colors={colors}>
        <HeaderCell width={108} label="Robot No" colors={colors} />
        <HeaderCell width={84} label="Block" colors={colors} />
        <HeaderCell width={96} label="Online Status" colors={colors} />
        <HeaderCell width={140} label="Last Uplink" colors={colors} />
      </HeaderShell>
    );
  }

  return (
    <HeaderShell width={CLEANING_LOG_TABLE_WIDTH} colors={colors}>
      <HeaderCell width={cleaningWidths.sr} label="Sr" colors={colors} />
      <HeaderCell width={cleaningWidths.robot} label="Robot No" colors={colors} />
      <HeaderCell width={cleaningWidths.status} label="Status" colors={colors} />
      <HeaderCell width={cleaningWidths.block} label="Block" colors={colors} />
      <HeaderCell width={cleaningWidths.rowNo} label="Row No" colors={colors} />
      <HeaderCell
        width={cleaningWidths.rowLength}
        label="Row Length (M)"
        colors={colors}
      />
      <HeaderCell
        width={cleaningWidths.percentage}
        label="Cleaning %"
        colors={colors}
      />
      <HeaderCell width={cleaningWidths.startedAt} label="Started At" colors={colors} />
      <HeaderCell width={cleaningWidths.finishedAt} label="Finished At" colors={colors} />
      <HeaderCell
        width={cleaningWidths.batteryStart}
        label="Battery Start"
        colors={colors}
      />
      <HeaderCell
        width={cleaningWidths.batteryEnd}
        label="Battery Finished"
        colors={colors}
      />
    </HeaderShell>
  );
}

export function getTableWidth(category: CleaningLogCategory) {
  if (category === 'dpr') return DPR_TABLE_WIDTH;
  if (category === 'offline') return OFFLINE_LOG_TABLE_WIDTH;
  if (category === 'not_started') return NOT_STARTED_TABLE_WIDTH;
  return CLEANING_LOG_TABLE_WIDTH;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  headerCell: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    lineHeight: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  technicianCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  technicianAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  technicianAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  technicianText: {
    flex: 1,
    minWidth: 0,
  },
  technicianName: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
  },
  technicianEmail: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
  },
  cell: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
  },
  cellBold: {
    fontWeight: '600',
  },
  cellHighlight: {
    fontWeight: '700',
    borderRadius: 4,
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
});
