import DatabaseInterface from "./database/Database.js";
import DataChef from "./live_data/DataChef.js";
import Player from "./users/Player.js";
import Team from "./users/Team.js";
import Timeline from "./timelines/Timeline.js";
import WebsocketManager from "./sessions/WebsocketManager.js";
import Sentinel, { SCHEDULES } from "./security/Sentinel.js";
import * as LUXON from "luxon";
import { RecurrenceRule, scheduleJob } from "node-schedule";

export enum GameState {
    PRE_GAME = "PRE_GAME",
    IN_GAME = "IN_GAME",
    POST_GAME = "POST_GAME",
}

export default class GameManager {

    private static _gameState: GameState = GameState.PRE_GAME;
    public static get gameState() { return this._gameState }

    private static server;

    private static gameTimeouts = [];

    private static _gameLoopRunning = false;
    public static get gameLoopRunning() { return this._gameLoopRunning }

    public static async start(server) {
        this.server = server;
        const GLOBALS: Record<string, any> = ((await DatabaseInterface.DB.query("SELECT * FROM globals;")) as any[]).reduce((acc, cur) => {
            acc[cur.name] = cur.value;
            return acc;
        }, {});

        if (!GLOBALS.active) {
            console.log("GAME NOT ACTIVE - aborting now...");
            return;
        }

        await Player.loadAll();
        await Team.loadAll();
        await Timeline.loadAll();
        await DataChef.start();
        await WebsocketManager.start(server);
        await this.daily();


        const RULE = new RecurrenceRule(undefined, undefined, undefined, undefined, 0, 0, 1, "US/Eastern");
        scheduleJob("setDaySchedule", RULE, this.daily)

        this._gameState = (await DatabaseInterface.DB.query("SELECT value FROM globals WHERE name = 'gameState';"))[0].value as GameState;

        const MAIN_TL = Timeline.timelines.find((v) => { return v.name === "main" });
        const GAME_DUR_EVENT = MAIN_TL.getEventByName("Game Duration");
        if (GAME_DUR_EVENT.start.diffNow().toMillis() < 0) {
            if (GAME_DUR_EVENT.end.diffNow().toMillis() < 0) {
                this.changeState(GameState.POST_GAME);
            } else {
                this.changeState(GameState.IN_GAME);
            }
        } else {
            this.changeState(GameState.PRE_GAME);
        }

        MAIN_TL.on("game_duration", (e, status) => {
            if (status === "START") this.changeState(GameState.IN_GAME);
            if (status === "END") this.changeState(GameState.POST_GAME);
        });

        if (this.gameState === GameState.IN_GAME) {
            this.startGameLoop();
        }

        console.log("Started up! Current state is", GameManager.gameState);

    }

    // This function used to also update shop related stuff, but that will be moved to the Shop class eventually.
    public static async updateGameTime(start?: LUXON.DateTime, end?: LUXON.DateTime) {
        const MAIN_TL = Timeline.getByName("main")

        const GD_EVENT = MAIN_TL.getEventByName("Game Duration");

        if (start) {
            GD_EVENT.start = start;
        }
        if (end) {
            GD_EVENT.end = end;
        }
    }

    public static async resetGame() {
        await DatabaseInterface.DB.query(`

            -- set material pool value to max
            UPDATE globals 
            SET "value" = (
                SELECT "value" FROM globals
                WHERE "name" = 'materialPoolSize'
                LIMIT 1
            ) 
            WHERE "name" = 'materialPoolValue';
            
            -- clear logs
            DELETE FROM logs;

            -- reset everyone's points to zero and remove them from teams
            UPDATE players SET points = 0, team = NULL;

            -- delete all teams
            DELETE FROM teams;

        `);
        await Player.loadAll();
        await Team.loadAll();
    }

    private static async daily() {
        const WEEKDAY = LUXON.DateTime.now().setZone("US/Eastern").weekday;
        switch (WEEKDAY) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
                Sentinel.schedule = SCHEDULES.regular;
                break;
            case 6:
            case 7:
                Sentinel.schedule = SCHEDULES.noSchool;
                break;
        }
        for (const P of Player.players) {
            P.schedulePopups();
        }
    }

    private static async changeState(state: GameState) {

        if (state === this.gameState) return;
        this._gameState = state;
        DatabaseInterface.DB.query("UPDATE globals SET \"value\" = $1 WHERE \"name\" = 'gameState';", [state]);

        switch (this.gameState) {

            case GameState.PRE_GAME: {
                this.stopGameLoop();
                break;
            }
            case GameState.IN_GAME: {
                this.startGameLoop();
                break;
            }
            case GameState.POST_GAME: {
                this.stopGameLoop();
                break;
            }

        }

    }

    // I cleaned up this class in a general sense - the game loop stuff inside this function is probably still garbage and ill deal with it later.
    private static startGameLoop() {

        if (this.gameLoopRunning) return;
        this._gameLoopRunning = true;

        // passive points
        this.gameTimeouts.push(setInterval((async () => {
            for (const p of Player.players) {
                p.points++;
            }
        }).bind(this), 5000));

        // save data
        this.gameTimeouts.push(setInterval((async () => {
            await Player.savePoints();
        }).bind(this), 10000));

        // minute ticks
        this.gameTimeouts.push(setInterval((() => {
            for (const P of Player.players) {
                for (const S of P.popupSchedule) {

                    if (S.start.minute === LUXON.DateTime.now().setZone("US/Eastern").minute) {
                        P.emit("pointPopup", {
                            start: S.start.toMillis(),
                            end: S.end.toMillis(),
                            value: S.value,
                        });
                    }
                }
            }

        }).bind(this), 60000));

        // periodic logging
        this.gameTimeouts.push(setTimeout(async () => {
            await Team.logPoints();
            await Player.logPoints();
            this.gameTimeouts.push(setInterval(async () => {
                await Team.logPoints();
                await Player.logPoints();
            }, 1200000));

        }, 1201000 - (Date.now() % 1200000)));
    }

    private static stopGameLoop() {

        if (!this.gameLoopRunning) return;
        this._gameLoopRunning = false;

        for (const T of this.gameTimeouts) {
            clearTimeout(T);
            clearInterval(T);
        }
        this.gameTimeouts = [];

    }


}