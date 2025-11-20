//helper to decode the access token payload to identify user roles
import { decode as b64decode } from "base-64";


export function decodeJwt(token) {
    try {
        //we split the jwt to only the payload part since it is the only one we need
        const payloadPart = token.split(".")[1];
        if (!payloadPart) return null;

        //jwt uses base64url instead of base64 so we have to  normalize it
        const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");

        //base64 length has to be multiple of 4 so must add padding just in case
        const padded = base64 + "===".slice((base64.length + 3) % 4);

        //decode base64 
        const jsonStr = typeof b64decode === "function" ? b64decode(padded) : "";

        //sometimes environments give binary so we must re encode it to utf
        const normalized = decodeURIComponent(escape(jsonStr));

        //parse the json
        return JSON.parse(normalized);
    } catch {
        //if theres any errors with parsing or decoding simply return null
        return null;
    }
}