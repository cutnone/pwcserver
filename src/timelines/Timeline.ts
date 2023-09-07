import DatabaseInterface from "../database/Database.js"
import TimelineEvent from "./TimelineEvent.js";
import EventConfiguration from "./EventConfiguration.js";
import * as LUXON from "luxon";
import EventEmitter from "events";
import SCHEDULER from "node-schedule";

export default class Timeline extends EventEmitter {

    // STATIC //

    public static timelines: Timeline[] = [];

    public static async loadAll() {
        await EventConfiguration.loadAll();
        const TIMELINE_DATA = await DatabaseInterface.DB.query("SELECT * FROM timelines;");
        for (const T of TIMELINE_DATA) {
            const TL = new Timeline({
                id: T.id,
                name: T.name,
            });
            await TL.setup();
            this.timelines.push(TL);
        }
    }

    public static getByName(timelineName: string): Timeline {
        const FOUND = this.timelines.find(v => { return v.name == timelineName });
        if (!FOUND) throw new Error(`Timeline "${timelineName}" does not exist.`);
        return FOUND;
    }

    // OBJECT //

    private _id: number;
    get id(): number { return this._id }
    set id(v: number) { this._id = v; this.save("id", v) }
    private _name: string;
    get name(): string { return this._name }
    set name(v: string) { this._name = v; this.save("name", v) }
    get activeEvents(): TimelineEvent[] {

        return this.events.filter((v) => {
            return v.isActive;
        })
    }

    public events: TimelineEvent[] = [];

    private constructor(data: {
        id: number,
        name: string,
    }) {
        super();
        this._id = data.id;
        this._name = data.name;
    }

    public getEventByName(eventName: string): TimelineEvent {
        const FOUND = this.events.find(v => { return v.name == eventName });
        if (!FOUND) throw new Error(`Event "${eventName}" does not exist on timeline "${this.name}".`);
        return FOUND;
    }

    public async addEvent(event: TimelineEvent) {
        const START = event.start;
        const RULE = new SCHEDULER.RecurrenceRule(START.year, START.month - 1, START.day, undefined, START.hour, START.minute, undefined, "Etc/UTC");
        RULE.tz = "Etc/UTC";
        const J = SCHEDULER.scheduleJob(event.id.toString(), RULE, (() => {
            console.log(event.name);
            this.emit(event.configuration.eventType, event, (event.end) ? "START" : "IMPULSE",);
            if (event.end) event.activate()
        }).bind(this));

        if (event.end) {
            const END = event.end;
            const E_RULE = new SCHEDULER.RecurrenceRule(END.year, END.month - 1, END.day, undefined, END.hour, END.minute, undefined, "Etc/UTC");
            E_RULE.tz = "Etc/UTC";
            const J = SCHEDULER.scheduleJob(event.id.toString(), E_RULE, (() => {
                console.log(event.name);
                this.emit(event.configuration.eventType, event, "END");
                event.deactivate()
            }).bind(this));
        }


        this.events.push(event);
    }

    private async setup() {
        const EVENTS_DATA = await DatabaseInterface.DB.query("SELECT * FROM timeline_events WHERE timeline_id = $1;", [this._id]);
        for (const E of EVENTS_DATA) {

            const EVENT = new TimelineEvent({
                id: E.id,
                name: E.name,
                configuration: E.configuration_id,
                timelineId: E.timeline_id,
                start: LUXON.DateTime.fromJSDate(E.start_at, {
                    zone: "UTC",
                }),
                end: LUXON.DateTime.fromJSDate(E.end_at, {
                    zone: "UTC",
                }) || undefined,
            });

            this.addEvent(EVENT);
        }
    }

    private save(column: string, value) {
        DatabaseInterface.DB.query("UPDATE timelines SET \"" + column + "\" = $1 WHERE id = $2", [value, this.id]);
    }


}