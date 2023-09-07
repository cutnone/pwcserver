import * as COOKIE from "cookie";
import { Server, Socket } from "socket.io";
import Authentication from "../security/Authentication.js";
import Session from "./Session.js";
import WebsocketConnection from "./WebsocketConnection.js";

export default class WebsocketManager {

    public static server: Server;

    public static async start(server) {
        this.server = new Server(server, {

        });

        this.server.on("connection", async (socket: Socket) => {
            if (socket.request.headers.cookie) {
                const COOKIES = COOKIE.parse(socket.request.headers.cookie);
                if (await Authentication.isLoggedIn(COOKIES.token)) {
                    Session.createOrRestore(new WebsocketConnection(socket));
                } else {
                    socket.emit("BAD_TOKEN");
                    socket.disconnect();
                }
            } else {
                console.log("rejected non-logged-in socket");

                socket.disconnect();
            }
        });


    }

}