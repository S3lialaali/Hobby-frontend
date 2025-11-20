//hook to read the access token in the memory
//then decodes it with jwt.js and returns the id and role of the user
import { useMemo } from "react";
import { getAccessToken } from "../api/client";
import { decodeJwt } from "./jwt";

export function useCurrentUser() {
    //get the current access token that is in memory after login/signup
    const token = getAccessToken();
    return useMemo(() => {
        //no token return null, otherwise return sub which is id and role of user
        if (!token) return { id: null, role: null};
        const payload = decodeJwt(token);
        return { id: payload?.sub ?? null, role: payload?.role ?? null};
    }, [token]);
}