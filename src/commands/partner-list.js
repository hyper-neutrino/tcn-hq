import { ApplicationCommandType } from "discord.js";
import { characters, character_images } from "../data.js";
import { get_api_guilds } from "../lib/api.js";

export const command = {
    type: ApplicationCommandType.ChatInput,
    name: "partner-list",
    description:
        "generate the long-form full partner list in the current channel",
};

export async function execute(cmd) {
    await cmd.reply({
        embeds: [
            {
                title: "Generating...",
                description:
                    "This may take a few seconds; thank you for your patience!",
                color: 0x2d3136,
            },
        ],
        ephemeral: true,
    });

    const guilds = await get_api_guilds();
    guilds.sort((a, b) => a.name.localeCompare(b.name));

    const messages = [];

    while (guilds.length > 0) {
        const block = guilds.splice(0, 10);
        const embeds = [];

        for (const guild of block) {
            let owner, advisor;

            if (guild.owner) {
                try {
                    owner = await cmd.client.users.fetch(guild.owner);
                } catch {
                    owner = { tag: "Unknown User#0000", id: guild.owner };
                }
            }

            if (guild.advisor) {
                try {
                    advisor = await cmd.client.users.fetch(guild.advisor);
                } catch {
                    advisor = { tag: "Unknown User#0000", id: guild.advisor };
                }
            }

            embeds.push({
                title: guild.name,
                description: `${characters[guild.character].join(
                    " "
                )}\n\n**Owner**: <@${owner.id}> (${owner.tag})${
                    advisor
                        ? `\n**Advisor**: <@${advisor.id}> (${advisor.tag})`
                        : ""
                }`,
                image: { url: "https://i.imgur.com/U9Wqlug.png" },
                thumbnail: { url: character_images[guild.character] },
                footer: { text: guild.id },
                url: `https://discord.com/invite/${guild.invite}`,
                color: 0x2d3136,
            });
        }

        messages.push({ embeds });
    }

    for (const message of messages) await cmd.channel.send(message);

    await cmd.followUp({
        embeds: [
            {
                title: "Done!",
                description: "The long-form partner list has been generated.",
                color: 0x2d3136,
            },
        ],
        ephemeral: true,
    });
}
