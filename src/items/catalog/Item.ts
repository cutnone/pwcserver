import DatabaseInterface from "../../database/Database.js";
import Haircut from "./Haircut.js";

export type ItemData = {
    id: number,
    type: string,
    level: number | null,
    owner: number | null,
    data: any,
}

export default abstract class Item {

    // STATIC //

    public static create: () => Item | Promise<Item>;

    public static items: Item[] = [];

    public static readonly TYPE_MAP: { [dbname: string]: typeof Item } = {
        "HAIRCUT": Haircut,
    }

    public static async loadAll() {
        const ITEM_DATA: any[] = await DatabaseInterface.DB.query("SELECT joincode, leader, id, name, archived FROM teams");
        for (const i of ITEM_DATA) {
            if (i.archived) continue;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const ITEM = new (this.TYPE_MAP[i.type])({
                id: i.id,
                type: i.type,
                level: i.level,
                owner: i.owner,
                data: i.data,
            });
            this.items.push(ITEM);
        }
    }

    // OBJECT //

    private _id: number;
    get id(): number { return this._id }
    set id(v: number) { this._id = v; this.save("id", v) }
    private _type: string;
    get type(): string { return this._type }
    set type(v: string) { this._type = v; this.save("type", v) }
    private _level: number | null;
    get level(): number | null { return this._level }
    set level(v: number | null) { this._level = v; this.save("level", v) }
    private _owner: number | null;
    get owner(): number | null { return this._owner }
    set owner(v: number | null) { this._owner = v; this.save("owner", v) }
    private _data: any;
    get data(): any { return this._data }
    set data(v: any) { this._data = v; this.save("data", v) }

    public abstract activate(...any): any;

    constructor(data: ItemData) {
        this._id = data.id;
        this._type = data.type;
        this._level = data.level;
        this._owner = data.owner;
        this._data = data.data;
    }

    private save(column: string, value) {
        DatabaseInterface.DB.query("UPDATE items SET \"" + column + "\" = $1 WHERE id = $2", [value, this.id]);
    }

}