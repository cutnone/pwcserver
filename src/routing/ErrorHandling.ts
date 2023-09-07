export default function error(status: number, data?: any): Error {
    return new Error(status, data)
}


export class Error {
    readonly status: number;
    readonly data?: any;
    constructor(status: number, data?: any) {
        this.status = status;
        this.data = data;
    }
}