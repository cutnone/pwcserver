import DatabaseInterface from "../database/Database.js";
import Player from "./Player.js";
import { ensureLeader } from "../routing/Endpoints/TeamEndpoints.js";

export default class Team {

    // STATIC //

    public static teams: Team[] = [];

    public static getById(teamId: number): Team {
        const FOUND = this.teams.find(v => { return v.id == teamId });
        if (!FOUND) throw new Error(`Team with id "${teamId}" does not exist.`);
        return FOUND;
    }

    public static async loadTeam(id: number): Promise<Team> {
        const FOUND = this.teams.find((v) => { return v.id === id; });
        if (FOUND) return FOUND;

        const TEAM_DATA: any = (await DatabaseInterface.DB.query("SELECT joincode, leader, id, name, archived FROM teams WHERE id = $1 LIMIT 1;", [id]))[0];
        if (!TEAM_DATA || TEAM_DATA.archived) return null;
        const TEAM = new Team({
            id: TEAM_DATA.id,
            name: TEAM_DATA.name,
            joinCode: TEAM_DATA.joincode,
            leader: TEAM_DATA.leader,
        })
        this.teams.push(TEAM);
        return TEAM;
    }

    public static async loadAll() {
        this.teams = [];
        const TEAM_DATA: any[] = await DatabaseInterface.DB.query("SELECT joincode, leader, id, name, archived FROM teams");
        for (const t of TEAM_DATA) {
            if (t.archived) continue;
            const TEAM = new Team({
                id: t.id,
                name: t.name,
                joinCode: t.joincode,
                leader: t.leader,
            });
            this.teams.push(TEAM);
            await ensureLeader(TEAM.id);
        }
    }

    public static async logPoints() {
        const MAP = {};
        for (const T of this.teams) {
            MAP[T.id] = T.points;
        }

        await DatabaseInterface.DB.query("INSERT INTO logs (type, data) VALUES ('TEAM_POINTS', $1)", [MAP]);
    }

    // OBJECT //

    private _id: number;
    get id(): number { return this._id }
    set id(v: number) { this._id = v; this.save("id", v) }

    private _name: string;
    get name(): string { return this._name }
    set name(v: string) { this._name = v; this.save("name", v) }

    private _joinCode: string;
    get joinCode(): string { return this._joinCode }
    set joinCode(v: string) { this._joinCode = v; this.save("joincode", v) }

    private _leader: number;
    get leader(): number { return this._leader }
    set leader(v: number) { this._leader = v; this.save("leader", v) }

    get members(): Player[] {
        return Player.players.filter((p) => {
            return p.team === this._id;
        });
    }

    get points(): number {
        const POINTS = this.members.reduce((acc: any, current) => {
            return acc + current.points;
        }, 0 as number);
        return POINTS
    }

    constructor(data: {
        id: number,
        name: string,
        joinCode: string,
        leader: number,
    }) {
        this._id = data.id;
        this._name = data.name;
        this._joinCode = data.joinCode;
        this._leader = data.leader;
    }

    private save(column: string, value) {
        DatabaseInterface.DB.query("UPDATE teams SET \"" + column + "\" = $1 WHERE id = $2", [value, this.id]);
    }

}