import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { SiteRobotOption } from '../../types/technicianDpr';

type Props = {
  visible: boolean;
  loading: boolean;
  robots: SiteRobotOption[];
  selectedRobotIds: string[];
  onClose: () => void;
  onSelect: (robot: SiteRobotOption) => void;
};

export function DprRobotPickerModal({
  visible,
  loading,
  robots,
  selectedRobotIds,
  onClose,
  onSelect,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Select Robots
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={robots}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const added = selectedRobotIds.includes(item._id);
              return (
                <View
                  style={[
                    styles.row,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.rowInfo}>
                    <Text style={[styles.robotNo, { color: colors.textPrimary }]}>
                      {item.robot_no ?? '—'}
                    </Text>
                    <Text style={[styles.block, { color: colors.textMuted }]}>
                      Block {item.block ?? '—'}
                    </Text>
                  </View>
                  <Button
                    title={added ? 'Added' : 'Add'}
                    size="sm"
                    variant={added ? 'outline' : 'danger'}
                    disabled={added}
                    onPress={() => onSelect(item)}
                  />
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No robots found for this site.
              </Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    ...typography.h3,
    fontSize: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  robotNo: {
    ...typography.label,
  },
  block: {
    ...typography.caption,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
