import type Session from "../sessions/Session.js";

export default class SessionCollection extends Array<Session> {



    public emitToAll(event: string, ...args) {
        for (const S of this) {
            S.queueEmit(event, ...args);
        }
    }
    public activityEmitToAll(event: string, ...args) {
        this.emitToAll("activity:"+event, ...args);
    }

}