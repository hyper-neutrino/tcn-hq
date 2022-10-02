import { ButtonStyle, Colors, ComponentType } from "discord.js";
import { bar, characters, _bar } from "../data.js";
import { timestamp } from "../utils.js";
import { get_api_guilds, get_api_user } from "./api.js";

export default async function (user) {
    let member;

    try {
        member = await user.client.hq.members.fetch(user.id);
    } catch {}

    try {
        let api_user;

        try {
            api_user = await get_api_user(user.id);
        } catch {}

        const guilds = await get_api_guilds();

        let position;
        let representing;

        let exit = false;

        for (const guild of guilds) {
            for (const key of ["owner", "advisor"]) {
                if (guild[key] == user.id) {
                    if (position) {
                        position =
                            ":x: This user's position data contains errors. Use `/audit` to find all issues.";
                        representing = null;
                        exit = true;
                        break;
                    } else {
                        position = `${
                            {
                                owner: "Server Owner",
                                advisor: "Council Advisor",
                            }[key]
                        } of ${guild.name} (${characters[guild.character].join(
                            " "
                        )} Mains: \`${guild.id}\`)`;

                        representing = guild;
                    }
                }
            }

            if (exit) break;
        }

        const banner = user.bannerURL({
            dynamic: true,
            size: 4096,
        });

        return {
            embeds: [
                {
                    title: `User info for ${user.tag}`,
                    fields: [
                        {
                            name: "Created",
                            value: `${timestamp(user.createdAt)} (${timestamp(
                                user.createdAt,
                                "R"
                            )})`,
                        },
                        {
                            name: "Position",
                            value: user.bot
                                ? "This user is a bot."
                                : position ??
                                  "This user does not have a position.",
                        },
                        ...(api_user?.roles.includes("observer")
                            ? [
                                  {
                                      name: "Observer",
                                      value: ":tools: This user is an **observer**.",
                                  },
                              ]
                            : []),
                        {
                            name: "TCN Roles",
                            value:
                                api_user?.roles
                                    .map((role) => `\`${role}\``)
                                    .join(", ") || "(none)",
                        },
                    ],
                    thumbnail: {
                        url: user.displayAvatarURL({
                            dynamic: true,
                            size: 4096,
                        }),
                    },
                    image: {
                        url: banner ?? _bar,
                    },
                },
                ...(member
                    ? [
                          {
                              title: `Member info for ${member.displayName}`,
                              fields: [
                                  {
                                      name: "Joined",
                                      value: `${timestamp(
                                          member.joinedAt
                                      )} (${timestamp(member.joinedAt, "R")})`,
                                  },
                                  {
                                      name: "Server Roles",
                                      value:
                                          member.roles.cache
                                              .toJSON()
                                              .sort((a, b) =>
                                                  b.comparePositionTo(a)
                                              )
                                              .map((role) => role.toString())
                                              .join(" ") || "(none)",
                                  },
                              ],
                              thumbnail: {
                                  url: member.avatarURL({
                                      dynamic: true,
                                      size: 4096,
                                  }),
                              },
                              ...bar,
                          },
                      ]
                    : []),
            ].map((embed) => ({ ...embed, color: 0x2d3136 })),
            components:
                representing || api_user?.roles.includes("observer")
                    ? [
                          {
                              type: ComponentType.ActionRow,
                              components: [
                                  ...(api_user?.roles.includes("observer")
                                      ? [
                                            {
                                                type: ComponentType.Button,
                                                style: ButtonStyle.Secondary,
                                                label: "Observer Info",
                                                customId: "::info/observers",
                                            },
                                        ]
                                      : []),
                                  ...(representing
                                      ? [
                                            {
                                                type: ComponentType.Button,
                                                style: ButtonStyle.Secondary,
                                                label: `${representing.name} Server Info`,
                                                customId: `::info/server:${representing.id}`,
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
                    description: `An error occurred while attempting to fetch info for ${user}.`,
                    color: Colors.Red,
                },
            ],
        };
    }
}
