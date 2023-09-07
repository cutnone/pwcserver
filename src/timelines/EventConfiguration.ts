import deepEqual from "deep-equal";
import DatabaseInterface from "../database/Database.js";

export default class EventConfiguration<CTYPE = any> {


    // STATIC //

    public static eventConfigurations: EventConfiguration[] = [];

    public static async loadAll() {
        const EC_DATA = await DatabaseInterface.DB.query("SELECT * FROM event_configurations;");
        for (const ECD of EC_DATA) {
            const EC = new EventConfiguration({
                id: ECD.id,
                name: ECD.name,
                eventType: ECD.event_type,
                data: ECD.data,
            });
            this.eventConfigurations.push(EC);
        }
    }

    // OBJECT //

    private _id: number;
    get id(): number { return this._id }
    set id(v: number) { this._id = v; this.save("id", v) }
    private _name: string;
    get name(): string { return this._name }
    set name(v: string) { this._name = v; this.save("name", v) }
    private _eventType: string;
    get eventType(): string { return this._eventType }
    set eventType(v: string) { this._eventType = v; this.save("event_type", v) }
    private _data: CTYPE;
    get data(): CTYPE { return this._data }
    set data(v: CTYPE) { this._data = v; this.save("data", v) }

    /**
     * **Omitting the `data.id` parameter will create the event in the database.**
     */
    constructor(data: {
        id: number,
        name: string,
        eventType: string,
        force?: boolean;
        data: CTYPE,
    }) {

        if (!data.force) {
            for (const EC of EventConfiguration.eventConfigurations) {
                if (deepEqual(data.data, EC.data, {
                    strict: true,
                })) {
                    return EC; // RETURNING FROM A CONSTRUCTOR????? WHAT ARCANE GOBBLEDEGOOK IS THIS??????
                    // Since event configurations are stored in the database, to make the interface easier,
                    // I'm allowing you to make new EventConfiguration objects every time you make an event.
                    // When force is not set to true, this will look for any other configurations already
                    // made with the same data. If one is found, it will be used instead of creating a new
                    // object. This means no duplicate data in the database.
                }
            }
        }

        this._id = data.id;
        this._name = data.name;
        this._eventType = data.eventType;
        this._data = data.data;

        if (!data.id) this.create(data);
    }

    private async create(data: any) {
        this._id = (await DatabaseInterface.DB.query(
            `INSERT INTO event_configurations (event_type, data, name) VALUES ($1, $2, $3) RETURNING id;`,
            [data.eventType, data.data, data.name]))[0].id;
    }

    private save(column: string, value) {
        DatabaseInterface.DB.query("UPDATE event_configurations SET \"" + column + "\" = $1 WHERE id = $2", [value, this.id]);
    }

}