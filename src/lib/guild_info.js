import { ButtonStyle, Colors, ComponentType, SnowflakeUtil } from "discord.js";
import client from "../client.js";
import { bar, characters } from "../data.js";
import { timestamp } from "../utils.js";
import { get_api_guild } from "./api.js";

export default async function (id) {
    let guild;

    try {
        guild = await get_api_guild(id);
    } catch {
        return {
            embeds: [
                {
                    title: "ERROR",
                    description: "That is not a valid server.",
                    color: Colors.Red,
                },
            ],
        };
    }

    try {
        const created = Number(SnowflakeUtil.decode(guild.id).timestamp);

        let owner, advisor;

        try {
            owner = await client.users.fetch(guild.owner);
        } catch {}

        try {
            if (guild.advisor) {
                advisor = await client.users.fetch(guild.advisor);
            }
        } catch {}

        let invite;

        try {
            if (guild.invite) {
                invite = await client.fetchInvite(guild.invite);
            }
        } catch {}

        if (invite) {
            invite = invite.guild.id == guild.id ? invite.code : null;
        }

        return {
            embeds: [
                {
                    title: `Server Info for ${guild.name}`,
                    fields: [
                        {
                            name: "Created",
                            value: `${timestamp(created)} (${timestamp(
                                created,
                                "R"
                            )})`,
                        },
                        {
                            name: "Character",
                            value:
                                characters[guild.character]?.join(" ") ??
                                "[missing data]",
                        },
                        {
                            name: "Owner",
                            value: owner
                                ? `${owner} (${owner.tag} \`${owner.id}\`)${
                                      guild.voter == owner.id
                                          ? " :ballot_box:"
                                          : ""
                                  }`
                                : ":x: Failed to fetch.",
                        },
                        {
                            name: "Advisor",
                            value: advisor
                                ? `${advisor} (${advisor.tag} \`${
                                      advisor.id
                                  }\`)${
                                      guild.voter == advisor.id
                                          ? " :ballot_box:"
                                          : ""
                                  }`
                                : "(none)",
                        },
                        ...(guild.voter != owner?.id &&
                        guild.voter != advisor?.id
                            ? [
                                  {
                                      name: "Voter",
                                      value: "The voter for this server is missing! Use `/audit` to identify all issues.",
                                  },
                              ]
                            : []),
                        {
                            name: "Invite",
                            value: invite
                                ? `[discord.gg/${invite}](https://discord.com/invite/${invite})`
                                : "The invite for this server is missing, invalid, or incorrect! Use `/audit` to identify all issues.",
                        },
                    ],
                    color: 0x2d3136,
                    ...bar,
                },
            ],
            components:
                owner || advisor
                    ? [
                          {
                              type: ComponentType.ActionRow,
                              components: [
                                  ...(owner
                                      ? [
                                            {
                                                type: ComponentType.Button,
                                                style: ButtonStyle.Secondary,
                                                label: "Owner Info",
                                                customId: `::info/user:${owner.id}`,
                                            },
                                        ]
                                      : []),
                                  ...(advisor
                                      ? [
                                            {
                                                type: ComponentType.Button,
                                                style: ButtonStyle.Secondary,
                                                label: "Advisor Info",
                                                customId: `::info/user:${advisor.id}`,
                                            },
                                        ]
                                      : []),
                              ],
                          },
                      ]
                    : [],
        };
    } catch (error) {
        console.error(error);

        return {
            embeds: [
                {
                    title: "ERROR",
                    description: `An error occurred while attempting to display info for ${guild.name}.`,
                    color: Colors.Red,
                },
            ],
        };
    }
}
