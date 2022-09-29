import fetch from "node-fetch";
import config from "../config.js";

async function api(route) {
    const response = await fetch(
        `https://api.teyvatcollective.network${route}`,
        { headers: { Authorization: config.api_token } }
    );

    if (!response.ok) {
        throw `API did not return OK:\n- route: ${route}\n- ${response.status}: ${response.statusText}`;
    }

    return await response.json();
}

export async function get_api_users() {
    return await api("/users");
}

export async function get_api_guilds() {
    return await api("/guilds");
}

export async function get_api_user(user) {
    return await api(`/users/${user.id ?? user}`);
}

export async function get_api_guild(guild) {
    return await api(`/guilds/${guild.id ?? guild}`);
}

export async function get_observers() {
    return (await get_api_users()).filter((user) =>
        user.roles.includes("observer")
    );
}

export async function get_voters() {
    return (await get_api_users()).filter((user) =>
        user.roles.includes("voter")
    );
}

export async function get_council_members() {
    return (await get_api_users()).filter((user) =>
        ["owner", "advisor"].some((role) => user.roles.includes(role))
    );
}

export async function is_observer(user) {
    return (await get_api_user(user)).roles.includes("observer");
}

export async function is_voter(user) {
    return (await get_api_user(user)).roles.includes("voter");
}

export async function is_council_member(user) {
    const roles = (await get_api_user(user)).roles;
    return ["owner", "advisor"].some((role) => roles.includes(role));
}
