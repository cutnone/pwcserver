import { Response } from "express";

export default class DataPatron {

    private readonly RES: Response;
    private readonly BUFFER: string[] = []
    private drained: boolean = true;

    constructor(response: Response) {
        this.RES = response;
        this.RES.on("drain", this.tryWrite.bind(this))
    }

    public pushData(topic: string, data: any) {
        this.BUFFER.push(`${topic}:${JSON.stringify(data)}`);
        
        this.kickstart()
    }

    private kickstart() {
        if (this.drained) {
            this.writeNext()
        }
    }

    private tryWrite() {
        
        if (this.BUFFER.length !== 0) {
            this.writeNext()
        } else {
            this.drained = true;
        }
    }

    private writeNext() {
        this.drained = this.RES.write(this.BUFFER.shift()+"\n");

        if (this.drained && this.BUFFER.length > 0) this.writeNext()
        
    }

}