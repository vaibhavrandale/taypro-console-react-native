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
import { clearAuthToken, setAuthToken } from "../api/client";

const USER_STORAGE_KEY = "taypro_user";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(USER_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          setUser(JSON.parse(stored));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

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

    if (token) {
      await setAuthToken(token);
    }

    setUser(loggedInUser);
    await SecureStore.setItemAsync(
      USER_STORAGE_KEY,
      JSON.stringify(loggedInUser),
    );
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetchWithTimeout(`${API_BASE_URL}/auth/sign-out`, {
        method: "POST",
        timeoutMs: 10000,
      });
    } catch {
      // ignore network errors on sign out
    }

    setUser(null);
    await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
    await clearAuthToken();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      signOut,
    }),
    [user, isLoading, signIn, signOut],
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
