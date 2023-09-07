import PGPROMISE from "pg-promise";





class DatabaseInterface {

    public PGP = PGPROMISE({})

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    private test = 3;
    private _DB: PGPROMISE.IDatabase<PGPROMISE.IResultExt> = null;
    public get DB() { return this._DB };


    public async connect(dev: boolean) {
        if (this.DB) return;
        console.log("Connecting to Database");

        const DEV_DATABASE_IP = process.env.DB_DEV_DATABASE_IP;
        const DATABASE_PASS = process.env.DB_PASS;
        const PROD_DATABASE_IP = process.env.DB_PROD_DATABASE_IP;
        const DEV_DATABASE_NAME = process.env.DB_DEV_DATABASE_NAME;
        const PROD_DATABASE_NAME = process.env.DB_PROD_DATABASE_NAME;
        const DATABASE_PORT = parseInt(process.env.DB_PORT);
        const USERNAME = process.env.DB_USERNAME;
        
        this._DB = await this.PGP({
            host: dev ? DEV_DATABASE_IP : PROD_DATABASE_IP,
            port: DATABASE_PORT,
            database: dev ? DEV_DATABASE_NAME : PROD_DATABASE_NAME,
            user: USERNAME,
            password: DATABASE_PASS,
            max: 30,
        });
        console.log("Done");
    }

    public async log(category: string, data: any = {}) {
        await this._DB.query("INSERT INTO logs (type, data) VALUES ($1, $2)", [category, data])
    }

    public async setup() {
        //
    }
}

const DBI = new DatabaseInterface();

export default DBI;
