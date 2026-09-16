import React, { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Input, Logo } from "../components/ui";
import { Screen } from "../components/layout";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { fontFamily } from "../theme/fonts";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

const LOGO_ASPECT = 3696 / 1002;

export function LoginScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const logoWidth = Math.min(screenWidth - spacing.xxxxl, 220);
  const logoHeight = Math.round(logoWidth / LOGO_ASPECT);

  const scrollToForm = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleLogin = async () => {
    if (loading) return;

    Keyboard.dismiss();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email");
      scrollToForm();
      return;
    }
    if (!password) {
      setError("Please enter your password");
      scrollToForm();
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
      scrollToForm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false} padded={false} style={styles.screen}>
      <LinearGradient
        colors={
          isDark
            ? ["#070D1F", "#101936", "#0B2E2A"]
            : ["#F7F9FC", "#EEF3F8", "#E7F6F2"]
        }
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.flex}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom + spacing.xl,
              },
            ]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Logo
                size="xxxl"
                rounded={false}
                style={{ width: logoWidth, height: logoHeight }}
              />
              <Text style={[styles.product, { color: colors.textPrimary }]}>
                Nectyr
              </Text>
            </View>

            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: isDark
                    ? "rgba(26, 37, 71, 0.78)"
                    : colors.backgroundSecondary,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : colors.border,
                },
              ]}
            >
              <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                Welcome back
              </Text>
              <Text
                style={[styles.formSubtitle, { color: colors.textSecondary }]}
              >
                Sign in to your Nectyr account
              </Text>

              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                leftIcon="mail-outline"
                editable={!loading}
              />

              <Input
                label="Password"
                placeholder="Your password"
                value={password}
                inputRef={passwordRef}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError("");
                }}
                isPassword
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                submitBehavior="submit"
                onSubmitEditing={handleLogin}
                leftIcon="lock-closed-outline"
                editable={!loading}
              />

              <Pressable style={styles.forgotWrap} hitSlop={8}>
                <Text style={[styles.forgotText, { color: colors.primary }]}>
                  Forgot password?
                </Text>
              </Pressable>

              {error ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: colors.badge.error.bg },
                  ]}
                >
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <Button
                title="Sign in"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                fullWidth
                size="lg"
                icon="arrow-forward"
                style={styles.signInButton}
              />
            </View>

            {__DEV__ ? (
              <Text style={[styles.devHint, { color: colors.textMuted }]}>
                API: {API_BASE_URL}
              </Text>
            ) : null}

            <Text style={[styles.footer, { color: colors.textMuted }]}>
              Nectyr · Solar Robot Operations
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>

        <Pressable
          onPress={toggleTheme}
          style={[
            styles.themeButton,
            { top: insets.top + spacing.sm },
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(16,25,54,0.06)",
              borderColor: isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(16,25,54,0.08)",
            },
          ]}
          accessibilityLabel="Toggle theme"
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={18}
            color={colors.textPrimary}
          />
        </Pressable>
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  themeButton: {
    position: "absolute",
    right: spacing.lg,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  product: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
  formCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: "#101936",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  formTitle: {
    ...typography.h2,
    fontSize: 22,
    lineHeight: 28,
  },
  formSubtitle: {
    ...typography.bodySmall,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    flex: 1,
    lineHeight: 18,
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  forgotText: {
    ...typography.caption,
    fontWeight: "500",
  },
  signInButton: {
    borderRadius: radius.pill,
    minHeight: 48,
  },
  devHint: {
    ...typography.caption,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  footer: {
    ...typography.caption,
    textAlign: "center",
    letterSpacing: 0.4,
  },
});
