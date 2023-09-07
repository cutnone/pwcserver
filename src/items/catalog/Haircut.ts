import DatabaseInterface from "../../database/Database.js";
import Item, { ItemData } from "./Item.js";
import Team from "../../users/Team.js";
import Player from "../../users/Player.js";

const POWER_MAP = { // level: percent to take
    1: 5,
    2: 10,
    3: 20
}

export default class Haircut extends Item {

    // STATIC //

    public static async create(level = 1, owner?: number): Promise<Haircut> {
        const HDAT = await DatabaseInterface.DB.query("INSERT INTO items (type, level, owner) VALUES ('HAIRCUT', $1, $2) RETURNING *;", [level, owner ?? null]);
        const H = new Haircut({
            id: HDAT.id,
            data: HDAT.data,
            level: HDAT.level,
            owner: HDAT.owner,
            type: HDAT.type,
        });
        Item.items.push(H);
        return H;
    }

    // OBJECT //

    public activate(opts: {
        target: number,
        targetType: "TEAM" | "PLAYER"
    }) {
        const FACTOR = (1 - (POWER_MAP[this.level ?? 1]) / 100);
        if (opts.targetType === "PLAYER") {
            const PLAYER = Player.getById(opts.target);
            if (!PLAYER) return;
            PLAYER.points = PLAYER.points * FACTOR;
        } else {
            const TEAM = Team.getById(opts.target);
            if (!TEAM) return;
            for (const M of TEAM.members) {
                M.points = M.points * FACTOR;
            }
        }
    };

    constructor(data: ItemData) {
        super(data);

    }
}