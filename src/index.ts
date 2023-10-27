///
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///                                                                                                                                                          ///
///      ________  ___       __           ________  ________  ___       ___       _______   ________ _________  ___  ________  ________   ________           ///
///     |\   __  \|\  \     |\  \        |\   ____\|\   __  \|\  \     |\  \     |\  ___ \ |\   ____\\___   ___\\  \|\   __  \|\   ___  \|\   ____\          ///
///     \ \  \|\  \ \  \    \ \  \       \ \  \___|\ \  \|\  \ \  \    \ \  \    \ \   __/|\ \  \___\|___ \  \_\ \  \ \  \|\  \ \  \\ \  \ \  \___|_         ///
///      \ \   ____\ \  \  __\ \  \       \ \  \    \ \  \\\  \ \  \    \ \  \    \ \  \_|/_\ \  \       \ \  \ \ \  \ \  \\\  \ \  \\ \  \ \_____  \        ///
///       \ \  \___|\ \  \|\__\_\  \       \ \  \____\ \  \\\  \ \  \____\ \  \____\ \  \_|\ \ \  \____   \ \  \ \ \  \ \  \\\  \ \  \\ \  \|____|\  \       ///
///        \ \__\    \ \____________\       \ \_______\ \_______\ \_______\ \_______\ \_______\ \_______\  \ \__\ \ \__\ \_______\ \__\\ \__\____\_\  \      ///
///         \|__|     \|____________|        \|_______|\|_______|\|_______|\|_______|\|_______|\|_______|   \|__|  \|__|\|_______|\|__| \|__|\_________\     ///
///                                                                                                                                         \|_________|     ///
///                     there's cool text because this is the entry point                                                                                    ///
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///

import express from 'express'
import { createServer } from 'http';

import DatabaseInterface from './database/Database.js';
import GameManager from './GameManager.js';
import DOTENV from "dotenv"
import Routing from './routing/Routing.js';

DOTENV.config();

// Start Server
const port = 3005
const app: express.Application = express();
const server = (createServer as Function)(app)

// Start Services
await DatabaseInterface.connect(!!process.env.dev);
await GameManager.start(server);
Routing.start(app)


// Listen for Connections
server.listen(port)

if (!process.env["IS_DEV"]) await DatabaseInterface.DB.query("INSERT INTO logs (type) VALUES ('SERVER_START')");