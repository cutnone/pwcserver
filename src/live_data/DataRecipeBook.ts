import Team from "../users/Team.js";
import Player from "../users/Player.js";
import Timeline from "../timelines/Timeline.js";
import DatabaseInterface from "../database/Database.js";
import * as LUXON from "luxon";
import GameManager, { GameState } from "../GameManager.js";

type DRBPages = { [key: string]: ((...args: string[]) => any) | DRBPages }
export const PROTECTED_DATA = ["gameData"];
/**
 * The Data Recipe Book containes functions that return updated data values for live data.
 */
export default class DataRecipeBook {

    public static async cook(path: string) {

        const args = path.split("/");
        return await this.cookInternal(this.pages, args);
    }

    private static async cookInternal(start: DRBPages, path: string[]) {
        const entry = start[path[0]];
        if (entry === undefined) return undefined;
        if (typeof entry === "object") {
            return await this.cookInternal(entry, path.slice(1));
        }
        return await entry(...path.slice(1));
    }

    public static pages: DRBPages = {
        players: (...args: string[]) => {
            if (args[0]) {
                const P = Player.getById(parseInt(args[0])) as any;
                if (!P?.id) return {};

                return {
                    id: P.id,
                    avatar: P.avatar,
                    familyName: P.familyName,
                    preferredName: P.preferredName,
                    points: P.points,
                    team: P.team ?? 0,
                }
            }
        },
        teams: (...args: any[]) => {

            if (args[0]) {
                
                if (!args[0]) return;
                const ID = parseInt(args[0]);
                if (isNaN(ID)) return;
                const TEAM = Team.getById(ID);
                if (!TEAM) return;
                const returnable = {
                    members: [],
                    leader: TEAM.leader,
                }
                for (const p of Player.players) {
                    if (p.team === ID) {
                        returnable.members.push(p.id);
                    }
                }

                return returnable;
            } else {
                const CALCULATED_DATA: Map<number, { points: number, memberCount: number }> = new Map();
                for (const p of Player.players) {

                    if (p.team) {
                        const CURRENT = CALCULATED_DATA.get(p.team);
                        if (!CURRENT) CALCULATED_DATA.set(p.team, { points: p.points, memberCount: 1 });
                        else { CURRENT.points += p.points; CURRENT.memberCount++; }
                    }
                }
                const RETURNABLE: any = {};

                for (const t of Team.teams) {
                    const CALCED = CALCULATED_DATA.get(t.id);
                    RETURNABLE[t.id] = ({
                        id: t.id,
                        name: t.name,
                        points: CALCED?.points || 0,
                        members: CALCED?.memberCount || 0,
                    });
                }
                return RETURNABLE;
            }
        },
        timelines: (name: string) => {
            const TL = Timeline.getByName(name);
            const RETURN = {};

            for (const E of TL.events) {
                RETURN[E.id.toString()] = {
                    id: E.id,
                    name: E.name,
                    start: E.start.toISO(),
                    end: E.end?.toISO(),
                }
            }

            return RETURN;
        },
        stats: {
            players: async (id: string, category: string) => {
                if (!id || !category) return;
                const ID = parseInt(id);
                if (isNaN(ID)) return;

                switch (category) {

                    case "points": {
                        const QUERY = `
                            SELECT * FROM (
                                SELECT timestamp, data->$1 AS points 
                                FROM logs 
                                WHERE type = 'PLAYER_POINTS' AND data->$1 IS NOT NULL 
                                ORDER BY timestamp DESC LIMIT 100
                            ) AS "points" ORDER BY timestamp;
                        `
                        const LOGS: any[] = await DatabaseInterface.DB.query(QUERY, [ID.toString()]);
                        const FORMATTED = {}
                        for (const L of LOGS) {
                            FORMATTED[L.timestamp.valueOf()] = L.points;
                        }
                        return FORMATTED;

                    }

                    default: {
                        return;
                    }

                }

            },
            teams: async (id: string, category: string) => {
                if (!id || !category) return;
                const ID = parseInt(id);
                if (isNaN(ID)) return;

                switch (category) {

                    case "points": {
                        const LOGS: any[] = await DatabaseInterface.DB.query("SELECT timestamp, data->$1 AS points FROM logs WHERE type = 'TEAM_POINTS' AND data->$1 IS NOT NULL ORDER BY timestamp;", [ID.toString()]);
                        const FORMATTED = {}
                        for (const L of LOGS) {
                            FORMATTED[(L.timestamp as Date).getTime()] = L.points;
                        }
                        return FORMATTED;
                    }

                    default: {
                        return;
                    }

                }

            }
        },
        shop: async () => {
            //
        },
        gameData: async () => {
            const MAIN_TL = Timeline.getByName("main");
            const GD_EVENT = MAIN_TL.getEventByName("Game Duration");


            const RETURNABLE = {

                start: GD_EVENT.start.toISO(),
                end: GD_EVENT.end.toISO(),
                status: GameManager.gameState,
                elapsed: (GameManager.gameState === GameState.POST_GAME) ? -GD_EVENT.start.diff(GD_EVENT.end).toMillis() : Math.max(0, -GD_EVENT.start.diffNow().toMillis()),
                // data: GameManager.activeGame.data, // might fix this later
            }


            return RETURNABLE;
        }
    }

}

