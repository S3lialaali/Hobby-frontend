//for auth related api calls
import { post } from "./client"

//login returns
export async function login(payload) {
    return post("/auth/login", payload);
}

//normal user signup 
export async function registerUser(payload) {
    return post("/auth/register", payload);
}

//business signup 
export async function registerBusiness(payload) {
    return post("/auth/register-business", payload);
}

//token refresh
export async function refresh(refreshToken) {
    return post("/auth/refresh", { refreshToken });
}

//logout (revokes refresh token)
export async function logout(refreshToken) {
    return post("/auth/logout", { refreshToken });
}

// send email verification code
export async function sendEmailVerification(email) {
    return post("/auth/send-email-verification", {email});
}

//verify email
export async function verifyEmail(payload) {
    //payload is email and code
    return post("/auth/verify-email", payload);
}