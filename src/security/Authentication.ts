import { decode } from "jsonwebtoken";
import DatabaseInterface from "../database/Database.js";
import { LoginTicket, OAuth2Client } from "google-auth-library";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export enum LoginResult {
    SUCCESS,
    BAD_CREDENTIALS,
    UNAUTHORIZED,
}

export default class Authentication {

    private static readonly CLIENT = new OAuth2Client(CLIENT_ID)

    static async isLoggedIn(token: string): Promise<boolean> {
        if (!token) {
            return false;
        }
        let tokenDecoded;
        try {
            tokenDecoded = decode(token);
        } catch {
            return false;
        }
        if (!tokenDecoded.sub) {
            return false;
        }

        const exists = (await DatabaseInterface.DB.query("SELECT EXISTS(SELECT FROM players WHERE googleid = $1);", [tokenDecoded.sub]))[0].exists;
        if (!exists) {
            return false;
        }
        return true;
    }

    public static async loginAttempt(credential: string): Promise<LoginResult> {
        // has token cookie
        
        let verified = true;
        const TICKET = await this.CLIENT.verifyIdToken({
            idToken: credential,
            audience: CLIENT_ID,
        }).catch(()=>{
            verified = false;
        }) as LoginTicket;
        if (!verified) return LoginResult.BAD_CREDENTIALS;
        const PAYLOAD = TICKET.getPayload();
        
        // has verified token

        const userExists = (await DatabaseInterface.DB.query("SELECT EXISTS(SELECT FROM players WHERE googleid = $1);", [PAYLOAD.sub]))[0].exists;
        if (userExists) {
            // good to go
            return LoginResult.SUCCESS;
        } else {
            // make sure they're allowed on before creating account
            if (PAYLOAD.hd?.endsWith(process.env.AUTH_ALLOWED_DOMAIN)) {
                // allowed on, create record
                await DatabaseInterface.DB.query("INSERT INTO players (googleid, preferredname, familyname, avatar, givenname) VALUES ($1, $2, $3, $4, $5)", [PAYLOAD.sub, capitalizeName(PAYLOAD.given_name), capitalizeName(PAYLOAD.family_name), PAYLOAD.picture, capitalizeName(PAYLOAD.given_name)]);
                return LoginResult.SUCCESS;
            } else {
                return LoginResult.UNAUTHORIZED;
            }
        }
    }

    static async getPlayerIdFromToken(token: string) {
        const DECODED = decode(token);
        return (await DatabaseInterface.DB.query("SELECT id FROM players WHERE googleid = $1;", [DECODED.sub]))[0].id;
    }

    static async isSetup(token: string): Promise<boolean> {
        if (await this.isLoggedIn(token)) {
            const tokenDecoded = decode(token);
            const lunch = (await DatabaseInterface.DB.query("SELECT lunch FROM players WHERE googleid = $1;", [tokenDecoded.sub]))[0].lunch;
            if (lunch) return true;
            else return false;

        } else return false;
    }
}

function capitalizeName(name: string): string {
    const CAPITALIZE_ON = [" ", "-"];
    const start = name.toLowerCase();
    let returnable = "";
    let capitalizeNext = true;
    for (const char of start) {
        if (CAPITALIZE_ON.includes(char)) {
            capitalizeNext = true;
            returnable += char;
        } else {
            returnable += capitalizeNext ? char.toUpperCase() : char;
            capitalizeNext = false;
        }
    }
    return returnable;
}