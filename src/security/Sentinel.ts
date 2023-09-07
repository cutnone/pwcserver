import type Player from "../users/Player.js";
import * as LUXON from "luxon";
import { DateTime } from "luxon";

export type Action = "RANDOM_EVENT"|"PAGE_ACCESS"
export type ScheduleState = "OPEN"|"INSTRUCTIONAL"|"A_LUNCH"|"B_LUNCH"|"C_LUNCH"|"DOWNTIME"
export type Schedule = {[minutes: number]: ScheduleState}

export const SCHEDULES: {[name: string]: Schedule} = {
    regular: {
        0: "DOWNTIME",
        // school lets people in at 7:00
        425: "OPEN",
        // block 1 - 7:35
        455: "INSTRUCTIONAL",
        519: "OPEN",
        // block 2 - 8:43
        523: "INSTRUCTIONAL",
        587: "OPEN",
        // bonus block - 9:51
        // --
        // block 3 - 10:25
        625: "INSTRUCTIONAL",
        689: "OPEN",
        // block 4 & lunches - 11:33
        693: "A_LUNCH",
        727: "B_LUNCH",
        762: "C_LUNCH",
        792: "OPEN",
        // block 5 - 1:16
        796: "INSTRUCTIONAL",
        860: "OPEN",
        // sleepytime - 8:00
        1200: "DOWNTIME",
    },
    PLT: {
        0: "DOWNTIME",
        // school lets people in at 7:05
        425: "OPEN",
        // block 1 - 7:35
        455: "INSTRUCTIONAL",
        493: "OPEN",
        // block 2 - 8:17
        497: "INSTRUCTIONAL",
        535: "OPEN",
        // block 3 - 8:59
        539: "INSTRUCTIONAL",
        577: "OPEN",
        // block 4 - 9:41
        581: "INSTRUCTIONAL",
        619: "OPEN",
        // block 5 - 10:23
        623: "INSTRUCTIONAL",
        660: "OPEN",
        // sleepytime - 8:00
        1200: "DOWNTIME",
    },
    noSchool: {
        0: "DOWNTIME",
        425: "OPEN",
        1200: "DOWNTIME",
    },
    delay: {
        0: "DOWNTIME",
        // school lets people in at 7:00
        425: "OPEN",
        // block 1 - 9:35
        575: "INSTRUCTIONAL",
        617: "OPEN",
        // block 2 - 10:21
        621: "INSTRUCTIONAL",
        587: "OPEN",
        // block 3 - 11:07
        667: "INSTRUCTIONAL",
        709: "OPEN",
        // block 4 & lunches - 11:53
        713: "A_LUNCH",
        749: "B_LUNCH",
        784: "C_LUNCH",
        814: "OPEN",
        // block 5 - 1:38
        818: "INSTRUCTIONAL",
        860: "OPEN",
        // sleepytime - 8:00
        1200: "DOWNTIME",
    }
}

export default class Sentinel {

    public static schedule: Schedule;

    public static isInOpenTime(player: Player, time = LUXON.DateTime.now()): boolean {
        if (player.permissionLevel >= 2) return true;
        const SCHEDULE = this.schedule;
        const NOW = time.setZone("US/Eastern");
        const DATE = NOW.startOf("day");
        const MINUTES = NOW.diff(DATE).as("minutes");
        let current = SCHEDULE[0];
        for (const MINS in SCHEDULE) {
            if (MINUTES > parseInt(MINS)) {
                current = SCHEDULE[MINS];
            }
            else break;
        }

        if (current === "OPEN") return true;
        if (current === "INSTRUCTIONAL" || current === "DOWNTIME") return false;
        const LUNCH = current[0];
        if (LUNCH === player.lunch) return true;
        return false;

    }

    public static getOpenTime(player?: Player): Map<number, LUXON.Duration> {
        const TIMES: Map<number, LUXON.Duration> = new Map();
        let prevOpen: number = undefined;
        for (const [mins, type] of Object.entries(this.schedule)) {
            if (type === "OPEN") {
                if (prevOpen === undefined) prevOpen = parseInt(mins);
                continue;
            }
            if (type === "DOWNTIME" || type === "INSTRUCTIONAL") {
                if (prevOpen !== undefined) {
                    TIMES.set(prevOpen, LUXON.Duration.fromObject({minutes: parseInt(mins)-prevOpen}));
                    prevOpen = undefined;
                }
            }
            if (type.endsWith("LUNCH")) {
                if (!player) {
                    if (prevOpen !== undefined) {
                        TIMES.set(prevOpen, LUXON.Duration.fromObject({minutes: parseInt(mins)-prevOpen}));
                        prevOpen = undefined;
                    }
                } else {

                    if (player.lunch === type[0]) {
                        if (prevOpen === undefined) prevOpen = parseInt(mins);
                        continue;
                    } else {
                        if (prevOpen !== undefined) {
                            TIMES.set(prevOpen, LUXON.Duration.fromObject({minutes: parseInt(mins)-prevOpen}));
                            prevOpen = undefined;
                        }
                    }

                }
                
            }
        }
        return TIMES;
    }

}