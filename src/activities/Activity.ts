import type Session from "../sessions/Session.js";
import SessionCollection from "./SessionCollection.js";

export default abstract class Activity {

    /* STATIC */
    
    public static activeActivities: Activity[] = [];

    /* OBJECT */

    public abstract readonly name: string;
    public clientState: any = null; // so lost sessions can be restored
    public sessions: SessionCollection = new SessionCollection;

    public constructor() {
        Activity.activeActivities.push(this);
    }

    public destroy(): void {
        Activity.activeActivities.splice(Activity.activeActivities.indexOf(this), 1);
    };

    /**
     * @param session The session attempting to join the activity
     * @param args Any other arguments passed (Ex. password)
     * @returns `true` if joining was successful, `false` if not
     */
    public abstract tryToJoin(session: Session, ...args: any[]): boolean;

    public disconnect(session: Session, ...args: any[]) {
        this.sessions.splice(this.sessions.indexOf(session), 1);
    }

}