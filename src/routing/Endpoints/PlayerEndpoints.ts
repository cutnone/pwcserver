import Authentication, { LoginResult } from "../../security/Authentication.js";
import { Endpoint } from "../Endpoint.js";
import {z} from "zod"
import error from "../ErrorHandling.js";
import GameManager from "../../GameManager.js";
import Player from "../../users/Player.js";

export default [
    {
        method: "POST",
        path: "/players/name-lunch",
        position: "PRE_SENTINEL",
        validation: z.object({
            name: z.string().min(1).max(24),
            lunch: z.enum(["A", "B", "C"]),
        }),
        handler: async (req, res, player) => {
            const PLAYER = player;
            const name = req.body.name;
            const lunch = req.body.lunch;
            let realLunch = lunch[0];
            PLAYER.lunch = realLunch;
            PLAYER.preferredName = name;
        },
    },
    {
        method: "GET",
        path: "/players/my-lunch",
        position: "PRE_SENTINEL",
        handler: async (req, res, player) => {
            return player.lunch;
        }
    },
    {
        method: "GET",
        path: "/players/my-info",
        position: "PRE_SENTINEL",
        handler: async (req, res, player) => {

            return {
                yourId: player.id,
                yourPermission: player.permissionLevel,
            };
        }
    },
    {
        method: "POST",
        path: "/login-attempt",
        position: "PRE_AUTH",
        validation: z.object({
            credential: z.string()
        }),
        async handler(req, res) {
            
            const RESULT = await Authentication.loginAttempt(req.body.credential)
            switch (RESULT) {
                case LoginResult.BAD_CREDENTIALS:
                    return error(400, "Bad Request")
                case LoginResult.UNAUTHORIZED:
                    return error(403, "Unauthorized")
            }
        },
    },
    {
        method: "GET",
        path: "/players/get",
        position: "PRE_SENTINEL",
        async handler(req, res) {
            const PID = req.query.id ?? req.query.googleid;
            if (!(req.query.id || req.query.googleid)) return error(400, "No player specified.")
            try {
                const PLAYER = req.query.id ? Player.getById(parseInt(req.query.id.toString())) : Player.getFromGID(req.query.googleid.toString())
                return {
                    avatar: PLAYER.avatar,
                    preferredName: PLAYER.preferredName,
                    familyName: PLAYER.familyName,
                    id: PLAYER.id,
                    permissionLevel: PLAYER.permissionLevel,
                    points: PLAYER.points,
                    team: PLAYER.team,
                }
            } catch (e) {
                return error(404, `Player "${PID}" does not exits.`)
            }
        },
    },
    {
        method: "GET",
        path: "/is-logged-in",
        position: "PRE_AUTH",
        async handler(req, res) {
            
            return await Authentication.isLoggedIn(req.headers?.authorization)
        },
    },
    {
        method: "GET",
        path: "/game-state",
        position: "PRE_SENTINEL",
        handler(req, res) {
            return GameManager.gameState
        },
    },
] as Endpoint[]