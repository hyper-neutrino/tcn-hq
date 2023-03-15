import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
} from "discord.js";
import db from "../db.js";
import dm from "../lib/dm.js";
import { defer } from "../utils.js";

export const command = {
    type: ApplicationCommandType.ChatInput,
    name: "dm-poll",
    description: "dm a poll",
    dm_permission: false,
    default_member_permissions: "0",
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
    await dm(poll);

    return "OK";
}
