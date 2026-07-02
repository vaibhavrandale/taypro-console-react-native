import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useSearch } from '../../context/SearchContext';
import { useTheme } from '../../theme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SearchGateway, SearchRobot } from '../../types/robotSearch';
import type { DrawerParamList } from '../../navigation/types';

type Navigation = DrawerNavigationProp<DrawerParamList>;

const MODAL_MAX_HEIGHT_RATIO = 0.72;

export function GlobalSearchModal() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation<Navigation>();
  const {
    visible,
    loading,
    error,
    closeSearch,
    refreshSearchData,
    searchRobots,
    searchGateways,
  } = useSearch();
  const [query, setQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const focusTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearFocusTimers = useCallback(() => {
    focusTimersRef.current.forEach(clearTimeout);
    focusTimersRef.current = [];
  }, []);

  const focusSearchInput = useCallback(() => {
    const focus = () => {
      inputRef.current?.focus();
    };

    clearFocusTimers();
    focus();

    const delays =
      Platform.OS === 'android' ? [120, 280, 450] : [80, 180];

    delays.forEach((delay) => {
      const timer = setTimeout(focus, delay);
      focusTimersRef.current.push(timer);
    });
  }, [clearFocusTimers]);

  useEffect(() => {
    if (!visible) {
      clearFocusTimers();
      return;
    }

    const frame = requestAnimationFrame(() => {
      focusSearchInput();
    });

    return () => {
      cancelAnimationFrame(frame);
      clearFocusTimers();
    };
  }, [visible, focusSearchInput, clearFocusTimers]);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const topOffset = insets.top + spacing.lg;
  const modalWidth = Math.min(windowWidth - spacing.xl * 2, 420);
  const availableHeight =
    windowHeight - keyboardHeight - topOffset - spacing.lg * 2;
  const modalMaxHeight = Math.min(
    windowHeight * MODAL_MAX_HEIGHT_RATIO,
    Math.max(availableHeight, 240),
  );
  const resultsMaxHeight = Math.max(modalMaxHeight - 140, 100);

  const robotResults = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return searchRobots(trimmed).slice(0, 30);
  }, [query, searchRobots]);

  const gatewayResults = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return searchGateways(trimmed).slice(0, 30);
  }, [query, searchGateways]);

  const hasResults = robotResults.length > 0 || gatewayResults.length > 0;

  const handleRobotSelect = (robot: SearchRobot) => {
    const { robot_no, site_id, block } = robot;
    if (!robot_no || !site_id || !block) return;

    closeSearch();
    setQuery('');
    navigation.navigate('RobotOperating', {
      robotNo: robot_no,
      siteId: site_id,
      block,
    });
  };

  const handleGatewaySelect = (gateway: SearchGateway) => {
    closeSearch();
    setQuery('');
    navigation.navigate('GatewayDetail', {
      gatewayId: gateway.gateway_id_in_lns_server ?? gateway._id ?? '',
      gatewayName: gateway.gateway_name,
      gatewayType: gateway.gateway_type,
    });
  };

  const handleClose = () => {
    Keyboard.dismiss();
    setQuery('');
    closeSearch();
  };

  const renderResultsBody = () => {
    if (loading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            Loading search index...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerState}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <Pressable onPress={() => void refreshSearchData()}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (!query.trim()) {
      return (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Type to search robots and gateways
        </Text>
      );
    }

    if (!hasResults) {
      return (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          No matches found
        </Text>
      );
    }

    return (
      <ScrollView
        style={styles.resultsScroll}
        contentContainerStyle={styles.resultsContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        {gatewayResults.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Gateways
            </Text>
            {gatewayResults.map((gateway, index) => (
              <Pressable
                key={
                  gateway._id ??
                  gateway.gateway_id_in_lns_server ??
                  `gateway-${index}`
                }
                onPress={() => handleGatewaySelect(gateway)}
                style={styles.resultLink}
              >
                <Text
                  style={[styles.resultLinkText, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  {gateway.gateway_name ?? '—'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {robotResults.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Robots
            </Text>
            {robotResults.map((robot, index) => (
              <Pressable
                key={robot._id ?? robot.robot_no ?? `robot-${index}`}
                onPress={() => handleRobotSelect(robot)}
                style={styles.resultLink}
              >
                <Text
                  style={[styles.resultLinkText, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  {robot.robot_no ?? '—'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'android' ? 'none' : 'fade'}
      onRequestClose={handleClose}
      onShow={focusSearchInput}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={[
          styles.overlay,
          {
            paddingTop: topOffset,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight : spacing.lg,
          },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={topOffset}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View
          style={[
            styles.card,
            {
              width: modalWidth,
              maxHeight: modalMaxHeight,
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Search Robot And Gateway
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              style={[
                styles.closeButton,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <View
              style={[
                styles.searchInputWrap,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
              ]}
              onLayout={() => {
                if (visible) {
                  focusSearchInput();
                }
              }}
            >
              <Ionicons
                name="search-outline"
                size={15}
                color={colors.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                ref={inputRef}
                placeholder="Search robot no, deveui, block, gateway..."
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoFocus
                showSoftInputOnFocus
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
            </View>

            <View style={[styles.resultsArea, { maxHeight: resultsMaxHeight }]}>
              {renderResultsBody()}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
    zIndex: 1,
    width: '100%',
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
    ...typography.label,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    paddingRight: spacing.sm,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    flexShrink: 1,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 38,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySmall,
    paddingVertical: spacing.sm,
  },
  resultsArea: {
    flexShrink: 1,
    minHeight: 100,
  },
  resultsScroll: {
    flexGrow: 0,
  },
  resultsContent: {
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  resultLink: {
    paddingVertical: spacing.xs,
  },
  resultLinkText: {
    ...typography.bodySmall,
    fontSize: 14,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 120,
  },
  stateText: {
    ...typography.bodySmall,
  },
  errorText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  retryText: {
    ...typography.label,
  },
  hint: {
    ...typography.bodySmall,
    textAlign: 'center',
    paddingTop: spacing.lg,
  },
});
