import DatabaseInterface from "../database/Database.js";
import Team from "./Team.js";
import PG from "pg-promise";
import type WebsocketConnection from "../sessions/WebsocketConnection.js";
import Sentinel from "../security/Sentinel.js";
import * as LUXON from "luxon";
import type Session from "../sessions/Session.js";

export enum PermissionLevel {
    PLAYER = 0,
    TESTER = 1,
    MODERATOR = 2,
    ADMIN = 3,
}

export default class Player {

    // STATIC //

    public static players: Player[] = [];

    public static getById(playerId: number): Player {
        const FOUND = this.players.find(v => { return v.id == playerId });
        if (!FOUND) throw new Error(`Player with id "${playerId}" does not exist.`);
        return FOUND;
    }

    public static async loadPlayer(id: number | string): Promise<Player> {
        let p: any;
        if (typeof id === "string") p = (await DatabaseInterface.DB.query("SELECT * FROM players WHERE googleid = $1", [id]))[0];
        else p = (await DatabaseInterface.DB.query("SELECT * FROM players WHERE id = $1", [id]))[0];
        const PLAYER = new Player({
            avatar: p.avatar,
            familyName: p.familyname,
            id: p.id,
            points: p.points,
            preferredName: p.preferredname,
            team: p.team,
            googleid: p.googleid,
            lunch: p.lunch,
            permissionLevel: p.permissionlevel,
        });
        this.players.push(PLAYER);
        if (p.team) {
            if (!Team.teams.find((v) => {
                return v.id === p.team;
            })) {
                await Team.loadTeam(p.team);
            }
        }
        return PLAYER;
    }

    public static async loadAll() {
        this.players = [];
        const PLAYER_DATA: any[] = await DatabaseInterface.DB.query("SELECT * FROM players");
        for (const p of PLAYER_DATA) {
            this.players.push(new Player({
                avatar: p.avatar,
                familyName: p.familyname,
                id: p.id,
                points: p.points,
                preferredName: p.preferredname,
                team: p.team,
                googleid: p.googleid,
                lunch: p.lunch,
                permissionLevel: p.permissionlevel,
            }));
        }
    }

    public static async savePoints() {
        const UPDATES: any[] = [];
        for (const p of this.players) {
            UPDATES.push({
                id: p.id,
                points: p.points,
            });
        }
        await DatabaseInterface.DB.query(PG().helpers.update(UPDATES, ["?id", "points"], "players") + " where t.id = v.id;");
    }

    public static async logPoints() {
        const MAP: Record<number, number> = {};
        for (const P of this.players) {
            MAP[P.id] = P.points;
        }
        await DatabaseInterface.DB.query("INSERT INTO logs (type, data) VALUES ('PLAYER_POINTS', $1)", [MAP]);
    }

    public static getFromGID(googleid: string): Player | undefined {
        return this.players.find((val) => {
            return val.googleid === googleid;
        });
    }

    // OBJECT //

    private _id: number;
    get id(): number { return this._id }
    set id(v: number) { this._id = v; this.save("id", v) }

    private _preferredName: string;
    get preferredName(): string { return this._preferredName }
    set preferredName(v: string) { this._preferredName = v; this.save("preferredName", v) }

    private _familyName: string;
    get familyName(): string { return this._familyName }
    set familyName(v: string) { this._familyName = v; this.save("familyName", v) }

    private _points: number;
    get points(): number { return this._points }
    set points(v: number) { this._points = Math.max(0, v) } // don't save this every time

    private _avatar: string;
    get avatar(): string { return this._avatar }
    set avatar(v: string) { this._avatar = v; this.save("avatar", v) }

    private _team: number;
    get team(): number { return this._team }
    set team(v: number) { this._team = v; this.save("team", v) }

    private _googleid: string;
    get googleid(): string { return this._googleid }
    set googleid(v: string) { this._googleid = v; this.save("googleid", v) }

    private _lunch: string;
    get lunch(): string { return this._lunch }
    set lunch(v: string) { this._lunch = v; this.save("lunch", v) }

    private _permissionLevel: PermissionLevel;
    get permissionLevel(): number { return this._permissionLevel }
    set permissionLevel(v: number) { this._permissionLevel = v; this.save("permissionLevel", v) }

    public activeSessions: Session[] = [];

    public popupSchedule: { start: LUXON.DateTime, end: LUXON.DateTime, value: number }[] = [];

    public emit(event: string, ...args: any[]) {
        for (const C of this.activeSessions) {
            C.queueEmit(event, ...args);
        }
    }

    constructor(data: {
        id: number,
        preferredName: string,
        familyName: string,
        points: number,
        avatar: string,
        team: number,
        googleid: string,
        lunch: string,
        permissionLevel: number,
    }) {
        this._id = data.id;
        this._preferredName = data.preferredName;
        this._familyName = data.familyName;
        this._points = data.points;
        this._team = data.team;
        this._avatar = data.avatar;
        this._googleid = data.googleid;
        this._lunch = data.lunch;
        this._permissionLevel = data.permissionLevel;
    }

    private save(column: string, value) {
        DatabaseInterface.DB.query("UPDATE players SET \"" + column + "\" = $1 WHERE id = $2", [value, this.id]);
    }

    private readonly POPUP_VALUES = [2000, 2000, 5000];
    private readonly POPUP_WINDOW = 10; // minutes within which a popup can be claimed
    public schedulePopups() {
        let OPEN_TIME = Sentinel.getOpenTime(this);
        const RETURN = [];
        for (const V of this.POPUP_VALUES) {
            if (OPEN_TIME.size < 1) OPEN_TIME = Sentinel.getOpenTime(this);
            const KEYS = [...OPEN_TIME.keys()];

            const START = KEYS[Math.floor(Math.random() * KEYS.length)];
            const DURATION = OPEN_TIME.get(START);

            OPEN_TIME.delete(START);
            const ADD: any = {};
            if (DURATION.as("minutes") <= this.POPUP_WINDOW) {
                ADD.start = LUXON.DateTime.now().setZone("US/Eastern").startOf("day").plus({ minutes: START });
                ADD.end = ADD.start.plus(DURATION);
            } else {
                const START_MIN = Math.floor(Math.random() * (DURATION.as("minutes") - this.POPUP_WINDOW));
                ADD.start = LUXON.DateTime.now().setZone("US/Eastern").startOf("day").plus({ minutes: START + START_MIN });
                ADD.end = ADD.start.plus({ minutes: this.POPUP_WINDOW });
            }
            ADD.value = V;
            RETURN.push(ADD);
        }
        this.popupSchedule = RETURN;
    }
}