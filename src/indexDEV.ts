import DatabaseInterface from "./database/Database.js";
import GameManager from "./GameManager.js";
export default class IndexDEV {

    public static async start(server) {

        await DatabaseInterface.connect(!!process.env["IS_DEV"]);
        await GameManager.start(server);

    }

}