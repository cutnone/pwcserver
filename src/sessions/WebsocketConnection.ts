import { decode } from "jsonwebtoken";
import type { Socket } from "socket.io";
import * as COOKIE from "cookie";
import Player from "../users/Player.js";

export default class WebsocketConnection {
    
    public socket: Socket;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public userData: any;

    public once;
    public on;
    public off;
    public onAny;
    public offAny;
    
    

    constructor(socket: Socket) {
        
        this.socket = socket;
        this.userData = decode(COOKIE.parse(socket.request.headers.cookie).token);
        if (!Player.players.find((v) => {
            return v.googleid === this.userData.sub;
        })) Player.loadPlayer(this.userData.sub);


        this.once = this.socket.once;
        this.onAny = this.socket.onAny;
        this.offAny = this.socket.offAny;
        this.on = this.socket.on;
        this.off = this.socket.off;


        

    }

    

}