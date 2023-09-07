
import { DateTime } from "luxon";
import { Endpoint } from "../Endpoint.js";
import GameManager from "../../GameManager.js";
import error from "../ErrorHandling.js";
import { PermissionLevel } from "../../users/Player.js";

// claim x
export default [

    {
        method: "POST",
        path: "/manage/game/update-game-duration",
        permissionRequired: PermissionLevel.ADMIN,
        handler: async (req, res, player) => {
            const SETTINGS = req.body;
            GameManager.updateGameTime((SETTINGS.start) ? DateTime.fromISO(SETTINGS.start) : undefined, (SETTINGS.end) ? DateTime.fromISO(SETTINGS.end) : undefined);
        },
    },
    {
        method: "POST",
        path: "/manage/game/reset",
        permissionRequired: PermissionLevel.ADMIN,
        handler: async (req, res, player) => {
            if (player.permissionLevel < 2) return;
            GameManager.resetGame();
        }
    }


] as Endpoint[]