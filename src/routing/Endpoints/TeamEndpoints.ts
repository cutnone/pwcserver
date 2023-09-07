import DatabaseInterface from "../../database/Database.js";
import Team from "../../users/Team.js";
import Player from "../../users/Player.js";
import DataRecipeBook from "../../live_data/DataRecipeBook.js";
import { Endpoint } from "../Endpoint.js";
import {z} from "zod"
import error from "../ErrorHandling.js";

export default [
    {
        path: "/teams/join",
        method: "POST",
        validation: z.string().length(6),
        handler: async (req, res, player) => {
            const CODE = req.body.toUpperCase()
            const TEAM = (await DatabaseInterface.DB.query("SELECT id FROM teams WHERE joincode = $1;", [CODE]))[0]?.id;
            if (!TEAM) return error(404, "There does not exist a team with that join code.");
            const MEMBERS = (await DatabaseInterface.DB.query("SELECT FROM players WHERE team = $1;", [TEAM])).length;
            if (MEMBERS >= 6) return error(409, "That team is full.");
            const CHECK = player.team;
            player.team = TEAM;
            await ensureLeader(CHECK);
        },
    },
    {
        method: "POST",
        path: "/teams/leave",
        handler: async (req, res, player) => {
            if (!player.team) return error(400, "Not currently in a team.");
            else {
                const CHECK = player.team;
                player.team = null;
                await ensureLeader(CHECK)
                DataRecipeBook.cook("players/" + player.id);
            }
        },
    },
    {
        method: "POST",
        path: "/teams/create",
        validation: z.string().min(1).max(24),
        handler: async (req, res, player) => {

            const TEAM = (await DatabaseInterface.DB.query("INSERT INTO teams (name, leader, joincode) VALUES ($1, $2, $3); SELECT id, joincode FROM teams WHERE leader = $2", [name, player.id, makeJoinCode()]))[0];
            player.team = TEAM.id;
            Team.teams.push(new Team({
                id: TEAM.id,
                joinCode: TEAM.joinCode,
                leader: player.id,
                name: req.body,
            }));
        },
    },
    {
        path: "/teams/rename",
        method: "PUT",
        validation: z.object({
            team: z.number().int(),
            name: z.string().min(1).max(24)
        }),
        handler: async (req, res, player) => {
            const NAME = req.body.name.trim();

            const TEAM = Team.getById(req.body.team);
            if (!TEAM) return error(404, `Team "${TEAM}" not found.`);
            if (TEAM.leader !== player.id) return error(401, "You need to be the leader of that team to do that.");

            TEAM.name = NAME;
        },
    },
    {
        path: "/teams/regenerate-join-code",
        method: "PUT",
        validation: z.number().int(),
        handler: async (req, res, player) => { // 1 = No such team, 2 = Insufficient permissions
            const TEAM_ID = req.body;
            const TEAM = Team.getById(TEAM_ID);
            if (!TEAM) return error(404, `Team "${TEAM_ID}" not found.`);
            if (TEAM.leader !== player.id) return error(401, "You need to be the leader of that team to do that.");

            TEAM.joinCode = makeJoinCode();
        },
    },
    {
        path: "/teams/kick",
        method: "DELETE",
        validation: z.object({
            team: z.number().int(),
            member: z.number().int(),
        }),
        handler: async (req, res, player) => {
            
            const TEAM_ID = req.body.team;
            const TEAM = Team.getById(TEAM_ID);
            if (!TEAM) return error(404, `Team "${TEAM_ID}" not found.`);
            
            const PLAYER_ID = req.body.player;
            const PLAYER = Player.getById(PLAYER_ID);
            if (!PLAYER) return error(404, `Player "${PLAYER_ID}" not found.`);
            if (TEAM.leader !== player.id) return error(401, "You need to be the leader of that team to do that.");

            PLAYER.team = null;

        }
    },
    {
        method: "GET",
        path: "/teams/get-join-code",
        handler: async (req, res, player) => {

            const ID = parseInt(req.query.teamId.toString());
            if (isNaN(ID)) return error(400, "Team ID is not a number.");
            const PLAYER_ID = player.id;
            const TEAM = await DatabaseInterface.DB.query("SELECT id, leader, joincode FROM teams WHERE id = $1;", [ID]); 
            if (!TEAM[0]) {
                return error(404, "Team not found.");
            }
            if (TEAM[0]?.leader === PLAYER_ID) {
                return TEAM[0].joincode;
            } else {
                return error(403, "You must be the team leader to do that.");
            }
        },
    },
    {
        method: "GET",
        path: "/teams/get",
        position: "PRE_SENTINEL",
        async handler(req, res) {
            const TID = req.query.id.toString();

            if (!TID) return error(400, "No team specified.")
            try {
                const TEAM = Team.getById(parseInt(TID));
                return {
                    id: TEAM.id,
                    name: TEAM.name,
                    leader: TEAM.leader,
                    points: TEAM.points,
                    members: TEAM.members.map((v)=>v.id)
                }
            } catch (e) {
                return error(404, `Team "${TID}" does not exits.`)
            }
        },
    },
] as Endpoint[]

export async function ensureLeader(teamId: number) {

    const TEAM = (await DatabaseInterface.DB.query("SELECT leader FROM teams WHERE id = $1", [teamId]))[0];
    if (!TEAM) return;
    if (Player.players.find((v) => {
        return v.id === TEAM.leader && v.team === teamId;
    })) return;
    // no leader
    const MEMBER = Player.getById(teamId);
    const T = Team.getById(teamId);
    if (MEMBER) {
        // has members

        T.leader = MEMBER.id;
    } else {

        // no members
        Team.teams.splice(Team.teams.indexOf(T), 1);
        await DatabaseInterface.DB.query("UPDATE teams SET archived = true, leader = NULL WHERE id = $1", [teamId]);

    }

}

const CODE_CHARS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

function makeJoinCode(): string {
    let returnMe = "";
    for (let i = 0; i < 6; i++) {
        returnMe += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return returnMe;
}