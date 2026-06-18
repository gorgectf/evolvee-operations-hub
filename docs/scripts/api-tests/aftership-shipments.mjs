import { requireEnv, getEnv, getJson, show } from "./_env.mjs";

const { AFTERSHIP_API_KEY } = requireEnv("AFTERSHIP_API_KEY");
const version = getEnv("AFTERSHIP_API_VERSION", "2026-01");

const url = "https://api.aftership.com/tracking/" + version + "/trackings?limit=5";

const data = await getJson(url, {
    headers: {
        "as-api-key": AFTERSHIP_API_KEY,
        "Content-Type": "application/json",
    },
});

let rawTrackings;
if (data && data.data && data.data.trackings) {
    rawTrackings = data.data.trackings;
} else if (data && data.trackings) {
    rawTrackings = data.trackings;
} else {
    rawTrackings = [];
}

const trackings = [];
for (let i = 0; i < rawTrackings.length; i++) {
    const t = rawTrackings[i];
    trackings.push({
        id: t.id,
        tracking_number: t.tracking_number,
        slug: t.slug,
        tag: t.tag,
        last_updated_at: t.updated_at,
    });
}

console.log("\n  AfterShip returned " + trackings.length + " shipment(s).");
show("Sample shipments (trimmed)", trackings);
console.log(
    "  Live shipment updates arrive via inbound webhook (POST to your\n" +
    "  backend), verified with the aftership-hmac-sha256 signature header.\n"
);