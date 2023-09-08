import DataBuffet from "./DataBuffet.js";
import DataRecipeBook from "./DataRecipeBook.js";

/**
 * The Data Chef is an agent that cycles through the Data Pantry updating and serving new data.
 * HELLO CHAT. IS THIS REAL?
 */
export default class DataChef {

    public static async start() {
        setInterval(async ()=>{
            for (const [p, b] of DataBuffet.dataBins) {
                
                const NEW_VAL = await DataRecipeBook.cook(p);
                if (typeof NEW_VAL !== typeof b.value) {
                    for (const c of b.customers) {
                        c.pushData(p, NEW_VAL)
                    }
                } else if (typeof NEW_VAL !== "object") {
                    if (NEW_VAL !== b.value) {
                        for (const c of b.customers) {
                            c.pushData(p, NEW_VAL)
                        }
                    }
                } else {
                    const DIFFERENCE = getDifference(b.value, NEW_VAL);
                    const DELETE = persistanceMapToDeleteMap(getPersisted(b.value, NEW_VAL));
                    
                    
                    if (DIFFERENCE !== undefined) {
                        
                        const SEND = mergeDeep(DIFFERENCE, DELETE);
                        
                        
                        
                        for (const c of b.customers) {
                            c.pushData(p, SEND)
                        }
                    } else if (Object.keys(DELETE).length !== 0) {
                        for (const c of b.customers) {
                            c.pushData(p, DELETE)
                        }
                    }
                }
                b.value = NEW_VAL;
                
            }
        }, 1000);
         
    }

}

function getDifference(OLD_VALUE, NEW_VALUE): any {
    if (typeof OLD_VALUE !== typeof NEW_VALUE) return NEW_VALUE;
    if (typeof OLD_VALUE !== "object" || OLD_VALUE === null) {
        if (OLD_VALUE === NEW_VALUE) return undefined;
        else return NEW_VALUE;
    }
    const BUILD = {};
    for (const [k, v] of Object.entries(OLD_VALUE)) {
        const DIFFERENCE = getDifference(v, NEW_VALUE[k])
        if (DIFFERENCE !== undefined) {
            BUILD[k] = DIFFERENCE;
        }
    }
    for (const [k, v] of Object.entries(NEW_VALUE)) {
        const DIFFERENCE = getDifference(OLD_VALUE[k], v);
        if (DIFFERENCE !== undefined) {
            BUILD[k] = DIFFERENCE;
        }
    }
    if (Object.keys(BUILD).length === 0) return undefined;
    else return BUILD;
}

function getPersisted(OLD_VALUE, NEW_VALUE) {
    if (typeof NEW_VALUE === "undefined") return false;
    if (typeof OLD_VALUE !== typeof NEW_VALUE) return true;
    if (typeof OLD_VALUE !== "object" || OLD_VALUE === null) return true;

    const BUILD = {};
    for (const [k, v] of Object.entries(OLD_VALUE)) {
        const DIFFERENCE = getPersisted(v, NEW_VALUE[k])
        BUILD[k] = DIFFERENCE;
    }
    return BUILD;
}

function persistanceMapToDeleteMap(PERSIST_MAP) {
    const BUILD = {};
    for (const [k, v] of Object.entries(PERSIST_MAP)) {
        if (v === false) {
            BUILD[k] = null;
        } else if (typeof v === "object") {
            const MAP = persistanceMapToDeleteMap(v); 
        
            if (Object.keys(MAP).length !== 0) BUILD[k] = MAP;
        }
    }
    return BUILD;
}

// from https://stackoverflow.com/a/34749873
/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
 function isObject(item) {
    return (item && typeof item === 'object');
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}