import Pusher from "pusher";

let cached: Pusher | null | undefined;

export function getPusherServer(): Pusher | null {
    if (cached !== undefined) return cached;

    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER;

    if (!appId || !key || !secret || !cluster) {
        cached = null;
        return cached;
    }

    cached = new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
    });

    return cached;
}
