import { Application } from "express";
import DataBuffet from "./DataBuffet.js";
import DataPatron from "./DataPatron.js";


export default class LiveData {

    static instance: LiveData;
    
    public static start(app: Application) {
        this.instance = new LiveData(app)
    }

    readonly app: Application;

    private constructor(app: Application) {
        this.app = app;
        app.get("/live-data", (req, res)=>{
            
            if (!req.query.topics) {
                res.status(400)
                return;
            }

            const PATRON = new DataPatron(res)

            let topics = req.query.topics;
            if (Array.isArray(topics)) topics = topics.join(",");
            topics = topics.toString().split(",");

            res.once("close", ()=>{
                DataBuffet.abduct(PATRON)
            })

            res.type("text/event-stream")
            res.setHeader("Transfer-Encoding", "chunked");
            res.setHeader("Cache-Control", "no-cache")
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("X-Accel-Buffering", "no");
            res.flushHeaders()
            
            DataBuffet.placeOrders(PATRON, ...topics.filter((v)=>!!v))


        })
    }

}