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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Logo } from "../components/ui";
import { Screen } from "../components/layout";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export function LoginScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <Screen scroll={false} padded={false}>
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
              paddingTop: insets.top + spacing.md,
              paddingBottom: insets.bottom + spacing.xl,
            },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            {/* <Logo size="md" /> */}
            <Pressable
              onPress={toggleTheme}
              style={[
                styles.themeButton,
                { backgroundColor: colors.backgroundTertiary },
              ]}
              accessibilityLabel="Toggle theme"
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={16}
                color={colors.textPrimary}
              />
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Logo size="xxxl" />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Nectyr
            </Text>
          </View>

          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
              Welcome back
            </Text>
            <Text
              style={[styles.formSubtitle, { color: colors.textSecondary }]}
            >
              Sign in with your Nectyr account
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
              size="sm"
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  themeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing.sm,
    // gap: spacing.sm,
  },
  title: {
    ...typography.h1,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  formCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  formTitle: {
    ...typography.label,
    fontSize: 14,
  },
  formSubtitle: {
    ...typography.caption,
    marginTop: 2,
    marginBottom: spacing.sm,
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
    marginBottom: spacing.md,
  },
  forgotText: {
    ...typography.caption,
    fontWeight: "500",
  },
  signInButton: {
    borderRadius: radius.pill,
  },
  devHint: {
    ...typography.caption,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  footer: {
    ...typography.caption,
    textAlign: "center",
  },
});
