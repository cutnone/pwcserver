import DatabaseInterface from "../../database/Database.js";
import Activity from "../Activity.js";
export default abstract class Minigame extends Activity {



    protected summarize(data: any) {
        data.gameName = this.name;
        DatabaseInterface.log("MINIGAME_SUMMARY", data);
    }
}