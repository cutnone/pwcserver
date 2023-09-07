import type WebsocketConnection from "./WebsocketConnection.js";
import COOKIES from "cookie";
import type Activity from "../activities/Activity.js";
import Player from "../users/Player.js";
import DatabaseInterface from "../database/Database.js";
import DataBuffet from "../live_data/DataBuffet.js";
import EventEmitter from "events";
import { PROTECTED_DATA } from "../live_data/DataRecipeBook.js";

export default class Session {

    /* STATIC */

    public static sessions: Map<number, Session> = new Map();
    private static nextSessionIndex = 0;

    public static createOrRestore(connection: WebsocketConnection): Session {

        if (connection.socket.request.headers.cookie) {
            const SESSION_ID = parseInt(COOKIES.parse(connection.socket.request.headers.cookie).session);
            const SESSION = this.sessions.get(SESSION_ID);
            if (SESSION && SESSION.player.googleid === connection.userData.sub) {
                SESSION.restoreTo(connection);
                return SESSION;
            }
        }

        // no previous session

        const SESSION = new Session(connection, this.nextSessionIndex++);
        this.sessions.set(SESSION.id, SESSION);
        return SESSION;

    }

    /* OBJECT */

    public id: number;
    public connection: WebsocketConnection;
    public activity: Activity = null;
    public player: Player;
    public clientData: any = {};
    public dataOrders: string[] = [];
    public state: "DISCONNECTED" | "WORKING" = "WORKING";
    private messageBacklog = [];
    private activityEvents = new EventEmitter();

    private constructor(connection: WebsocketConnection, id: number) {
        this.connection = connection;
        this.id = id;

        this.setup();
    }

    public restoreTo(newConnection: WebsocketConnection) {
        this.connection = newConnection;
        this.state = "WORKING";
        this.setup(true);

    }

    public async setup(restore = false) {

        if (!this.player) {
            await Player.loadPlayer(this.connection.userData.sub);
            this.player = Player.getFromGID(this.connection.userData.sub);
        }

        if (!restore) {
            this.player.activeSessions.push(this);
        }

        this.connection.socket.on("theme_change", async (m) => {
            await DatabaseInterface.DB.query("UPDATE players SET displayTheme = $1 WHERE googleid = $2", ["" + m, this.player.id]);
        });

        this.connection.socket.once("disconnect", () => {
            this.state = "DISCONNECTED";
            this.connection = null;
        });

        const SETUP_OBJ = {
            yourId: this.player.id,
            sessionId: this.id,
            restoreFrom: null,
        }

        if (restore) {
            const RESTORE_OBJECT = structuredClone(this.clientData);
            RESTORE_OBJECT.activity = (this.activity) ? this.activity.clientState : null;
            SETUP_OBJ.restoreFrom = RESTORE_OBJECT;
        }

        this.connection.socket.emit("SETUP", SETUP_OBJ);

        for (const m of this.messageBacklog) {
            this.queueEmit(m[0], ...m[1]);
        }
        this.messageBacklog = [];

        this.sync();
    }
    public async sync() {
        this.connection.socket.emit("theme_update", (await DatabaseInterface.DB.query("SELECT displayTheme FROM players WHERE id = $1", [this.player.id]))[0].displaytheme);
        for (const S of this.player.popupSchedule) {
            if (S.start.diffNow().toMillis() <= 0 && S.end.diffNow().toMillis() > 0) {
                this.connection.socket.emit("pointPopup", {
                    start: S.start.toMillis(),
                    end: S.end.toMillis(),
                    value: S.value,
                });
            }
        }
    }

    public queueEmit(event: string, ...args) {
        if (this.state === "DISCONNECTED") {

            this.messageBacklog.push([event, args]);
        } else {
            this.connection.socket.emit(event, ...args);
        }
    }
    public queueActivityEmit(event: string, ...args) {
        this.queueEmit("activity:" + event, ...args);
    }

    public async destroy() {
        this.player.activeSessions.splice(this.player.activeSessions.indexOf(this), 1)

        if (this.connection) this.connection.socket.disconnect();
    }

    public onActivity(event: string, callback: (...args) => void) {

        this.activityEvents.on(event, (a) => { callback(...a) });
    }
    public offActivity(event: string, callback?: (...args) => void) {
        if (callback) this.activityEvents.off(event, callback);
        else this.activityEvents.removeAllListeners(event);
    }

    public connectActivity(activity: Activity) {
        this.disconnectActivity();
        this.activity = activity;
    }

    public disconnectActivity() {
        this.activity?.disconnect(this);
        this.activityEvents.removeAllListeners();
        this.activity = null;
    }

}