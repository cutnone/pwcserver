
import type Session from "../../sessions/Session.js";
import Player from "../../users/Player.js";
import { Endpoint } from "../Endpoint.js";
import error from "../ErrorHandling.js";

// claim x
export default [
    {
        path: "/claim/point-popup",
        method: "POST",
        
        handler: async (req, res, player) => {
            let popup = null;
            for (const P of player.popupSchedule) {
                if (P.start.diffNow().toMillis() <= 0 && P.end.diffNow().toMillis() > 0) { popup = P; continue; }
            }
            if (!popup) {
                return error(400, "Point Popup Expired");
            }
            player.popupSchedule.splice(player.popupSchedule.indexOf(popup), 1);
            player.points += popup.value;
            return { points: popup.value }
        }
    }

] as Endpoint[]