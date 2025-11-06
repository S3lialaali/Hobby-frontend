import {api} from "./client";

export type RegisterUserPayload = {
    username: string; 
    email: string;
    password: string;
    phone?: string | null;
};

export async function registerUser(payload: RegisterUserPayload) {
    const { data } = await api.post("/auth/register", payload);
    return data as{
        message: "user_created";
        user: any;
    };
}

export type RegisterBusinessPayload = {
    username: string;
    email: string;
    password: string;
    phone?: string | null;
    establishmentName: string;
    establishmentDescription?: string | null;
    establishmentCategory?: string | null;
    establishmentAddress?: string | null;
    lat?: number | null;
    lng?: number | null;
};

export async function registerBusiness(payload: RegisterBusinessPayload) {
    const { data } = await api.post("/auth/register-business", payload);
    return data as {
        message: "business_pending_approval" | string;
        user: any;
        establishment: { id: number; status: "pending" | "approved" | "rejected" };
    };
}

export async function login (payload: { identifier?: string; email?: string; phone?: string; password?: string}) {
    const { data } = await api.post("/auth/login", payload);
    return data as {
        user: any;
        business: { establishmentId: number; status: "pending" | "approved" | "rejected"} | null;
    };
}