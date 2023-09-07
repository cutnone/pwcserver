import type * as LUXON from "luxon";
import DatabaseInterface from "../database/Database.js";
import EventConfiguration from "./EventConfiguration.js";

export default class TimelineEvent {

    private _id: number;
    get id(): number { return this._id }
    set id(v: number) { this._id = v; this.save("id", v) }
    private _timelineId: number;
    get timelineId(): number { return this._timelineId }
    set timelineId(v: number) { this._timelineId = v; this.save("timeline_id", v) }
    private _configurationId: number;
    get configurationId(): number { return this._configurationId }
    set configurationId(v: number) { this._configurationId = v; this.save("configuration_id", v) }
    get configuration() { return EventConfiguration.eventConfigurations.find((v) => { return v.id === this.configurationId }) }
    private _name: string;
    get name(): string { return this._name }
    set name(v: string) { this._name = v; this.save("name", v) }
    private _start: LUXON.DateTime;
    get start(): LUXON.DateTime { return this._start }
    set start(v: LUXON.DateTime) { this._start = v; this.save("start_at", v) }
    private _end?: LUXON.DateTime = undefined;
    get end(): LUXON.DateTime | undefined { return this._end }
    set end(v: LUXON.DateTime | undefined) { this._end = v; this.save("end_at", v?.toJSDate() ?? null) }
    private _isActive = false;
    public get isActive() { return this._isActive }

    /**
     * **Omitting the `data.id` parameter will create the event in the database.**
     */
    constructor(data: {
        id?: number,
        name: string,
        timelineId: number,
        configuration: number | EventConfiguration,
        start: LUXON.DateTime,
        end?: LUXON.DateTime,
    }) {
        this._name = data.name;
        this._id = data.id;
        this._configurationId = (typeof data.configuration === "number") ? data.configuration : data.configuration.id;
        this._timelineId = data.timelineId;
        this._start = data.start;
        if (data.end) this._end = data.end;
        else data.end = null;

        if (!data.id) {
            this.create(data);
        }
    }

    private async create(data: any) {
        this._id = (await DatabaseInterface.DB.query(
            `INSERT INTO timeline_events (start_at, end_at, configuration_id, timeline_id, name) VALUES ($1, $2, $3, $4, $5) RETURNING id;`,
            [data.start, data.end, data.configurationId, data.timelineId, data.name]))[0].id;
    }

    private save(column: string, value) {
        DatabaseInterface.DB.query("UPDATE timeline_events SET \"" + column + "\" = $1 WHERE id = $2", [value, this.id]);
    }

    public activate() { this._isActive = true }
    public deactivate() { this._isActive = false }


}