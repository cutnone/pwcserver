import { Application, NextFunction, Request, Response, json, urlencoded } from "express";
import { Endpoint } from "./Endpoint.js";
import cookieParser from "cookie-parser";
import Authentication from "../security/Authentication.js";
import Player from "../users/Player.js";
import Sentinel from "../security/Sentinel.js";
import ClaimEndpoints from "./Endpoints/ClaimEndpoints.js";
import ManagementEndpoints from "./Endpoints/ManagementEndpoints.js";
import PlayerEndpoints from "./Endpoints/PlayerEndpoints.js";
import TeamEndpoints from "./Endpoints/TeamEndpoints.js";
import {z} from "zod"
import { fromZodError } from "zod-validation-error";
import { Error } from "./ErrorHandling.js";
import LiveData from "../live_data/LiveData.js";

export default class Routing {

    static start(app: Application) {
        const ALL_ROUTES = [
            ...ClaimEndpoints,
            ...ManagementEndpoints,
            ...PlayerEndpoints,
            ...TeamEndpoints,
        ]
        const PRE_AUTH = ALL_ROUTES.filter(r => r.position === "PRE_AUTH")
        const PRE_SENTINEL = ALL_ROUTES.filter(r => r.position === "PRE_SENTINEL")
        const NORMAL = ALL_ROUTES.filter(r => !r.position || r.position === "NORMAL")

        app.use((req, res, next)=>{
            console.log(req.method, req.url);
            next();
        })

        app.options("*", (req, res)=>{
            res.setHeader("Access-Control-Allow-Origin", "*")
            res.setHeader("Access-Control-Allow-Headers", "authorization,content-type")
            res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,HEAD,CONNECT,OPTIONS,TRACE")
            res.end()
        })
        app.use(cookieParser())
        app.use(json())
        app.use(urlencoded({ extended: true }))

        app.use((req, res, next)=>{
            res.setHeader("Access-Control-Allow-Origin", "*")
            res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type")
            next();
        })

        for (const E of PRE_AUTH) this.applyEndpoint(app, E)

        // authentication
        app.use(async (req, res, next) => {

            if (!await Authentication.isLoggedIn(req.headers.authorization)) {
                res.status(401)
                res.end()
                return;
            }
            
            res.locals.player = Player.getById(await Authentication.getPlayerIdFromToken(req.headers.authorization))
            
            next()
            
        })
        
        LiveData.start(app)
        
        for (const E of PRE_SENTINEL) this.applyEndpoint(app, E)
        
        // sentinel middleware
        app.use(async (req, res, next) => {
            if (Sentinel.isInOpenTime(res.locals.player)) next()
            else res.status(403).end()
        })

        for (const E of NORMAL) this.applyEndpoint(app, E)

    }

    private static applyEndpoint(app: Application, endpoint: Endpoint) {
                
        (app as any)[endpoint.method.toLowerCase()](endpoint.path, async (req: Request, res: Response, next: NextFunction) => {
            // Check permissions
            
            if (endpoint.permissionRequired) {

                if ((res.locals.player as Player).permissionLevel < endpoint.permissionRequired) {
                    res.status(403).end()
                    return;
                }

            }

            // Validate body
            if (endpoint.validation) {

                const VALIDATION_RESULTS = endpoint.validation.safeParse(req.body);
                
                if (VALIDATION_RESULTS.success === false) { // explicit check for false comforts typescript
                    const READABLE_ERROR = fromZodError(VALIDATION_RESULTS.error);
                    res.status(400).send(READABLE_ERROR).end()
                    return;
                }

            }

            // Send response or custom error
            const RESPONSE = await Promise.resolve(endpoint.handler(req, res, res.locals.player))
            if (RESPONSE instanceof Error) {
                res.status(RESPONSE.status)
                if (RESPONSE.data) res.send(RESPONSE.data);
            } else {
                res.status(200);
                if (RESPONSE !== undefined) {
                    res.send(RESPONSE);
                }
            }

            res.end()
        })

    }

}