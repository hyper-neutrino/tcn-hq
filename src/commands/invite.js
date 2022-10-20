import { ApplicationCommandType, Colors } from "discord.js";
import db from "../db.js";

export const command = {
    type: ApplicationCommandType.ChatInput,
    name: "invite",
    description: "obtain a one-time invite",
    dm_permission: false,
    default_member_permissions: "0",
    options: [],
};

export async function execute(cmd) {
    await cmd.deferReply({ ephemeral: true });

    const invite = await cmd.guild.invites.create("809970922701979678", {
        maxUses: 1,
        unique: true,
        maxAge: 604800,
    });
  
    await cmd.editReply(invite.url);
}
