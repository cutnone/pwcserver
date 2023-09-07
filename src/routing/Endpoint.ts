import { Request, RequestHandler, Response } from "express"
import * as Zod from "zod"
import { Error } from "./ErrorHandling.js"
import Player, { PermissionLevel } from "../users/Player.js"

export type Endpoint = {
    method: "GET"|"POST"|"PUT"|"PATCH"|"DELETE"|"HEAD"|"CONNECT"|"OPTIONS"|"TRACE",
    position?: "PRE_AUTH"|"PRE_SENTINEL"|"NORMAL",
    path: string,
    validation?: Zod.ZodSchema,
    permissionRequired?: PermissionLevel,
    handler: (req: Request, res: Response, player?: Player) => undefined | any | Error,
}