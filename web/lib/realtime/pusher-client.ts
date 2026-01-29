"use client";

import Pusher from "pusher-js";

let cached: Pusher | null | undefined;

export function getPusherClient(): Pusher | null {
    if (cached !== undefined) return cached;

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
        cached = null;
        return cached;
    }

    cached = new Pusher(key, {
        cluster,
        forceTLS: true,
        authEndpoint: "/api/pusher/auth",
        enabledTransports: ["ws", "wss"],
    });

    return cached;
}
