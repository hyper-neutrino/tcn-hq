import db from "./db.js";
import close from "./lib/close.js";
import dm from "./lib/dm.js";

async function cycle() {
    const now = new Date();

    for (const poll of await db("polls").find({ open: true }).toArray()) {
        if (poll.close && now > poll.close) {
            await close(poll);
        } else if (poll.dm && now > poll.dm) {
            await dm(poll);
        }
    }

    setTimeout(cycle, 10000);
}

cycle();
