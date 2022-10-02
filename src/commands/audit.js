import { ApplicationCommandType } from "discord.js";
import { bar, characters, space } from "../data.js";
import db from "../db.js";
import { get_api_guilds, get_api_users } from "../lib/api.js";
import { defer, ephemeral } from "../utils.js";

export const command = {
    type: ApplicationCommandType.ChatInput,
    name: "audit",
    description: "run the API and HQ data audit cycle",
    dm_permission: false,
    options: [ephemeral],
};

export async function execute(cmd) {
    await defer(cmd);

    const users = await get_api_users();
    const guilds = await get_api_guilds();

    const ownerless = guilds.filter((guild) => !guild.owner);
    const voterless = guilds.filter((guild) => !guild.voter);

    const council_map = new Map();
    for (const guild of guilds) {
        for (const user of [guild.owner, guild.advisor]) {
            if (!user) continue;
            if (!council_map.has(user)) council_map.set(user, []);
            council_map.get(user).push(guild);
        }
    }

    const duplicate_representatives = [...council_map.entries()].filter(
        ([_, guilds]) => guilds.length > 1
    );

    const wrong_voter = guilds.filter(
        (guild) =>
            guild.voter && ![guild.owner, guild.advisor].includes(guild.voter)
    );

    const voter_map = new Map();
    for (const guild of guilds) {
        if (!voter_map.has(guild.voter)) voter_map.set(guild.voter, []);
        voter_map.get(guild.voter).push(guild);
    }

    const duplicate_voters = [...voter_map.entries()].filter(
        ([_, guilds]) => guilds.length > 1
    );

    const authorized = users
        .filter((user) =>
            ["owner", "advisor"].some((x) => user.roles.includes(x))
        )
        .map((user) => user?.id)
        .filter((x) => x);

    const unauthorized = (await cmd.client.hq.members.fetch())
        .toJSON()
        .filter(
            (member) => !member.user.bot && !authorized.includes(member.id)
        );

    const missing = await Promise.all(
        authorized
            .filter((user) => !cmd.client.hq.members.cache.has(user))
            .map((user) => cmd.client.users.fetch(user))
    );

    const a2d_servers = new Map();
    const a2d_positions = new Map();

    const bound = new Set();

    for (const entry of await db("guild_bind").find({}).toArray()) {
        bound.add(entry.role);
        a2d_servers.set(entry.guild, entry.role);
    }

    for (const entry of await db("position_bind").find({}).toArray()) {
        bound.add(entry.role);
        a2d_positions.set(entry.position, entry.role);
    }

    const desynced = new Map();
    const expected = new Map();

    const insert = (table, key, item) => {
        if (!table.has(key)) table.set(key, new Set());
        table.get(key).add(item);
    };

    const wrong_invites = [];

    for (const guild of guilds) {
        if (!guild.invite) {
            wrong_invites.push(
                `The invite for ${guild.name} (${
                    characters[guild.character][3]
                }: \`${guild.id}\`) is missing.`
            );
        } else {
            let invite;

            try {
                invite = await cmd.client.fetchInvite(guild.invite);
            } catch {
                wrong_invites.push(
                    `The invite for ${guild.name} (${
                        characters[guild.character][3]
                    }: \`${guild.id}\`) is invalid (\`${guild.invite}\`).`
                );

                continue;
            }

            if (invite.guild.id != guild.id) {
                wrong_invites.push(
                    `The invite for ${guild.name} (${
                        characters[guild.character][3]
                    }: \`${guild.id}\`) points to the wrong server (\`${
                        guild.invite
                    }\` => \`${invite.id}\`).`
                );
            }
        }
    }

    let role;

    for (const guild of guilds) {
        for (const key of ["owner", "advisor", "voter"]) {
            if (!guild[key]) continue;

            let member;
            try {
                member = await cmd.client.hq.members.fetch(guild[key]);
            } catch {
                continue;
            }

            if ((role = a2d_servers.get(guild.id))) {
                insert(expected, member.id, role);

                if (!member.roles.cache.has(role)) {
                    insert(desynced, member.id, `missing <@&${role}>`);
                }
            }

            if ((role = a2d_positions.get(key))) {
                insert(expected, member.id, role);

                if (!member.roles.cache.has(role)) {
                    insert(desynced, member.id, `missing <@&${role}>`);
                }
            }
        }
    }

    if ((role = a2d_positions.get("observer"))) {
        for (const user of users) {
            if (user.roles.includes("observer")) {
                insert(expected, user.id, role);

                const member = cmd.client.hq.members.cache.get(user.id);

                if (member && !member.roles.cache.has(role)) {
                    insert(desynced, user.id, `missing <@&${role}>`);
                }
            }
        }
    }

    for (const member of cmd.client.hq.members.cache.toJSON()) {
        for (const role of member.roles.cache.toJSON()) {
            if (bound.has(role.id) && !expected.get(member.id)?.has(role.id)) {
                insert(desynced, member.id, `unexpected ${role}`);
            }
        }
    }

    return {
        embeds: [
            {
                title: "Audit: Stats",
                description: `Users: ${users.length}\nGuilds: ${
                    guilds.length
                }\nGuilds with no advisor: ${
                    guilds.filter((guild) => !guild.advisor).length
                }`,
            },
            {
                title: "Audit: API Data",
                description: `Checking for...\n- Guilds with no owner: ${
                    ownerless.length > 0
                        ? `:x: ${ownerless
                              .map((guild) => guild.name)
                              .join(", ")}`
                        : ":ok:"
                }\n- Guilds with no voter: ${
                    voterless.length > 0
                        ? `:x: ${voterless
                              .map((guild) => guild.name)
                              .join(", ")}`
                        : ":ok:"
                }\n- Duplicate Representatives: ${
                    duplicate_representatives.length > 0
                        ? `:x: ${duplicate_representatives
                              .map(
                                  ([user, guilds]) =>
                                      `<@${user}>: ${guilds
                                          .map(
                                              (guild) =>
                                                  `${guild.name} ${
                                                      guild.owner == user
                                                          ? guild.advisor ==
                                                            user
                                                              ? "Owner + Advisor"
                                                              : "Owner"
                                                          : "Advisor"
                                                  }`
                                          )
                                          .join(", ")}`
                              )
                              .join(", ")}`
                        : ":ok:"
                }\n- Voters who do not represent their server: ${
                    wrong_voter.length > 0
                        ? `:x: ${wrong_voter
                              .map((guild) => guild.name)
                              .join(", ")}`
                        : ":ok:"
                }\n- Duplicate Voters: ${
                    duplicate_voters.length > 0
                        ? `:x: ${duplicate_voters
                              .map(
                                  ([user, guilds]) =>
                                      `<@${user}>: ${guilds
                                          .map((guild) => guild.name)
                                          .join(", ")}`
                              )
                              .join(", ")}`
                        : ":ok:"
                }\n- Invalid Invites: ${
                    wrong_invites.length > 0
                        ? `\n${wrong_invites
                              .map((line) => `${space}- ${line}`)
                              .join("\n")}`
                        : ":ok:"
                }`,
            },
            {
                title: "Audit: HQ Sync",
                description: `Checking for...\n- Unauthorized members: ${
                    unauthorized.length > 0
                        ? `:x: ${unauthorized.map(
                              (member) =>
                                  `${member} (${member.user.tag} \`${member.id}\`)`
                          )}`
                        : ":ok:"
                }\n- Missing council members: ${
                    missing.length > 0
                        ? `:x: ${missing.map(
                              (user) => `${user} (${user.tag} \`${user.id}\`)`
                          )}`
                        : ":ok:"
                }\n- Desynced roles: ${
                    desynced.size > 0
                        ? `\n${[...desynced.entries()]
                              .map(([member, errors]) => [
                                  cmd.client.hq.members.cache.get(member),
                                  [...errors].sort(),
                              ])
                              .map(
                                  ([member, errors]) =>
                                      `${space}- ${member} (${
                                          member.user.tag
                                      } \`${member.id}\`): ${errors.join(", ")}`
                              )
                              .join("\n")}`
                        : ":ok:"
                }`,
            },
        ].map((embed) => ({
            ...((embed.description =
                embed.description.length > 4096
                    ? embed.description.substring(0, 4093) + "..."
                    : embed.description),
            embed),
            color: 0x2d3136,
            ...bar,
        })),
    };
}
