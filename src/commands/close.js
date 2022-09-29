import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
} from "discord.js";
import db from "../db.js";
import close from "../lib/close.js";
import { defer } from "../utils.js";

export const command = {
    type: ApplicationCommandType.ChatInput,
    name: "close-poll",
    description: "close a poll",
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "id",
            description: "poll id",
            required: true,
        },
    ],
};

export async function execute(cmd) {
    await defer(cmd);

    const poll = await db("polls").findOne({ id: cmd.options.getString("id") });
    await close(poll);

    return "OK";
}
