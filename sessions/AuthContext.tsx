import React, { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";
import { clearAccessToken, setAccessToken } from "../api/client";
import {
    clearRefreshToken,
    loadRefreshToken,
    saveRefreshToken,
} from "./storage";

type User = Record<string, any> | null;

type SignInPayload = { email: string; password: string } | Record<string, any>;

type AuthContextType = {
	user: User;
	initializing: boolean; // whether the provider is restoring session
	loading: boolean; // whether an auth action is in progress
	signIn: (payload: SignInPayload) => Promise<User>;
	signOut: () => Promise<void>;
	registerUser: (payload: Record<string, any>) => Promise<User>;
	registerBusiness: (payload: Record<string, any>) => Promise<User>;
	refreshSession: () => Promise<boolean>;
	sendEmailVerification: (email: string) => Promise<any>;
	verifyEmailCode: (payload: { email: string; code: string}) => Promise<any>;
	sendPhoneVerification: (phone: string) => Promise<void>;
    verifyPhoneCode: (payload: { phone: string; code: string }) => Promise<any>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User>(null);
	const [initializing, setInitializing] = useState(true);
	const [loading, setLoading] = useState(false);

	// Try to restore session from stored refresh token
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const ok = await refreshSession();
				// refreshSession will set user/access tokens when possible
				if (!ok && mounted) {
					setUser(null);
				}
			} catch (err) {
				if (mounted) setUser(null);
			} finally {
				if (mounted) setInitializing(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	async function refreshSession() {
		try {
			const stored = await loadRefreshToken();
			if (!stored) return false;
			setLoading(true);
			// authApi.refresh expects the refresh token param
			const data = await authApi.refresh(stored);
			// expected response: { accessToken, refreshToken, user }
			if (data?.accessToken) setAccessToken(data.accessToken);
			if (data?.refreshToken) await saveRefreshToken(data.refreshToken);
			console.log("REFRESH RESPONSE", data?.user, data?.business);
			console.log("AUTH CONTEXT USER AFTER REFRESH", user);
			if (data?.user) {
				setUser(data.user);
				console.log("REFRESH RESPONSE", data?.user, data?.business);
				console.log("AUTH CONTEXT USER AFTER REFRESH", user);
			}
			return true;
		} catch (err) {
			// failed to refresh; clear any stored tokens
			await clearRefreshToken();
			clearAccessToken();
			setUser(null);
			return false;
		} finally {
			setLoading(false);
		}
	}

	async function signIn(payload: SignInPayload) {
		setLoading(true);
		try {
			const data = await authApi.login(payload);
			// expected { accessToken, refreshToken, user }
			if (data?.accessToken) setAccessToken(data.accessToken);
			if (data?.refreshToken) await saveRefreshToken(data.refreshToken);
			if (data?.user) setUser(data.user);
			return data ?? null;
		} finally {
			setLoading(false);
		}
	}

	async function registerUser(payload: Record<string, any>) {
		setLoading(true);
		try {
			const data = await authApi.registerUser(payload);
			if (data?.accessToken) setAccessToken(data.accessToken);
			if (data?.refreshToken) await saveRefreshToken(data.refreshToken);
			if (data?.user) setUser(data.user);
			return data ?? null;
		} finally {
			setLoading(false);
		}
	}

	async function registerBusiness(payload: Record<string, any>) {
		setLoading(true);
		try {
			const data = await authApi.registerBusiness(payload);
			if (data?.accessToken) setAccessToken(data.accessToken);
			if (data?.refreshToken) await saveRefreshToken(data.refreshToken);
			if (data?.user) setUser(data.user);
			return data ?? null;
		} finally {
			setLoading(false);
		}
	}

	async function signOut() {
		setLoading(true);
		try {
			const stored = await loadRefreshToken();
			if (stored) {
				// attempt server-side logout (revoke refresh token). ignore errors
				try {
					await authApi.logout(stored);
				} catch (e) {}
			}
		} finally {
			// clear local tokens and user
			clearAccessToken();
			await clearRefreshToken();
			setUser(null);
			setLoading(false);
		}
	}

	async function sendEmailVerification(email: string) {
		return authApi.sendEmailVerification(email);
	}

	async function verifyEmailCode(payload: { email: string; code: string}) {
		const data = await authApi.verifyEmail(payload);
		if (data?.user) {
			setUser(data.user);  //updates is_email_verified in context
		}
		return data ?? null;
	}

	async function sendPhoneVerification(phone: string) {
		if (!phone) return;
		await authApi.sendPhoneVerification(phone);
	}

	async function verifyPhoneCode(payload: { phone: string; code: string }) {
		const { phone, code } = payload;
		if (!phone || !code) throw new Error("phone_and_code_required");

		const data = await authApi.verifyPhone({ phone, code });

		// If backend returns updated user with is_phone_verified = 1, update context
		if (data?.user) {
			setUser(data.user);
		}
		return data;
	}


	const value: AuthContextType = {
		user,
		initializing,
		loading,
		signIn,
		signOut,
		registerUser,
		registerBusiness,
		refreshSession,
		sendEmailVerification,
		verifyEmailCode,
		sendPhoneVerification,
		verifyPhoneCode
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
	return ctx;
}

export default AuthProvider;
