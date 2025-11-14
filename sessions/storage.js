import * as SecureStore from "expo-secure-store";

const REFRESH_KEY = "hobby.refreshToken";

export async function saveRefreshToken(token) {
    try {
        await SecureStore.setItemAsync(REFRESH_KEY, token || "");
    }
    catch {}
}

export async function loadRefreshToken(token) {
    try {
        return (await SecureStore.getItemAsync(REFRESH_KEY)) || null;
    }
    catch {return null;}
}

export async function clearRefreshToken(token) {
    try {
        await SecureStore.deleteItemAsync(REFRESH_KEY);
    }
    catch {}
}