import * as SecureStore from "expo-secure-store";

const REFRESH_KEY = "hobby.refreshToken";

export async function saveRefreshToken(token) {
    try {
        await SecureStore.setItemAsync(REFRESH_KEY, token || "");
    }
    catch {}
}

export async function loadRefreshToken() {
    try {
        return (await SecureStore.getItemAsync(REFRESH_KEY)) || null;
    }
    catch {return null;}
}

export async function clearRefreshToken() {
    try {
        await SecureStore.deleteItemAsync(REFRESH_KEY);
    }
    catch {}
}