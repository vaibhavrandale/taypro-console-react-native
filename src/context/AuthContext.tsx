import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config/api";
import { User } from "../types/auth";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";
import { clearAuthToken, getAuthToken, setAuthToken, apiFetch } from "../api/client";
import { fetchUserById } from "../api/users";
import { getJwtUserId } from "../utils/jwt";
import {
  USER_STORAGE_KEY,
  clearAllSessionData,
} from "../utils/sessionStorage";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateUser: (user: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractAuthPayload(payload: unknown): { user: User | null; token: string | null } {
  if (!payload || typeof payload !== "object") {
    return { user: null, token: null };
  }

  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const user =
    data.user && typeof data.user === "object" ? (data.user as User) : null;
  const token = typeof data.token === "string" ? data.token : null;

  return { user, token };
}

function assertTokenMatchesUser(token: string, userId: string): void {
  const tokenUserId = getJwtUserId(token);
  if (tokenUserId && tokenUserId !== userId) {
    throw new Error(
      `Auth token user (${tokenUserId}) does not match profile (${userId})`,
    );
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearStoredSession = useCallback(async () => {
    setUser(null);
    await clearAllSessionData();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [stored, token] = await Promise.all([
          SecureStore.getItemAsync(USER_STORAGE_KEY),
          getAuthToken(),
        ]);

        if (!stored) {
          if (token) await clearAuthToken();
          return;
        }

        const parsedUser = JSON.parse(stored) as User;

        if (!token || !parsedUser._id) {
          await clearStoredSession();
          return;
        }

        const tokenUserId = getJwtUserId(token);
        if (tokenUserId && tokenUserId !== parsedUser._id) {
          await clearStoredSession();
          return;
        }

        setUser(parsedUser);
      } catch {
        await clearStoredSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [clearStoredSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    let response: Response;

    try {
      response = await fetchWithTimeout(`${API_BASE_URL}/auth/sign-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
        timeoutMs: 30000,
        credentials: "omit",
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : `Cannot reach server at ${API_BASE_URL}`;
      throw new Error(message);
    }

    let result: unknown;
    const responseText = await response.text();

    try {
      result = responseText ? JSON.parse(responseText) : null;
    } catch {
      throw new Error(
        response.ok
          ? "Invalid response from server"
          : `Server error (${response.status}). Check API URL: ${API_BASE_URL}`,
      );
    }

    if (!response.ok) {
      const errorPayload = result as {
        error?: string;
        message?: string;
      } | null;
      throw new Error(
        errorPayload?.error ||
          errorPayload?.message ||
          `Login failed (${response.status})`,
      );
    }

    const { user: loggedInUser, token } = extractAuthPayload(result);
    if (!loggedInUser) {
      throw new Error("Login succeeded but no user data was returned");
    }

    await clearAuthToken();

    if (!token) {
      throw new Error("Login succeeded but no auth token was returned");
    }

    assertTokenMatchesUser(token, loggedInUser._id);

    await setAuthToken(token);

    setUser(loggedInUser);
    await SecureStore.setItemAsync(
      USER_STORAGE_KEY,
      JSON.stringify(loggedInUser),
    );
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiFetch("/auth/sign-out", {
        method: "POST",
        timeoutMs: 10000,
      });
    } catch {
      // ignore network errors on sign out
    }

    setUser(null);
    await clearAllSessionData();
  }, []);

  const updateUser = useCallback(async (next: User) => {
    setUser(next);
    await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = await SecureStore.getItemAsync(USER_STORAGE_KEY);
    if (!stored) return null;

    const current = JSON.parse(stored) as User;
    if (!current._id) return null;

    const fresh = await fetchUserById(current._id);
    const merged: User = { ...current, ...fresh };
    await updateUser(merged);
    return merged;
  }, [updateUser]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      signOut,
      refreshUser,
      updateUser,
    }),
    [user, isLoading, signIn, signOut, refreshUser, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
