import { requireEnv, getEnv, getJson, show } from "./_env.mjs";

const { KLAVIYO_PRIVATE_KEY } = requireEnv("KLAVIYO_PRIVATE_KEY");
const revision = getEnv("KLAVIYO_REVISION", "2025-07-15");

const url = "https://a.klaviyo.com/api/profiles/?page[size]=5";

const data = await getJson(url, {
    headers: {
        Authorization: "Klaviyo-API-Key " + KLAVIYO_PRIVATE_KEY,
        accept: "application/vnd.api+json",
        revision,
    },
});

let rawProfiles;
if (data && data.data) {
    rawProfiles = data.data;
} else {
    rawProfiles = [];
}

const profiles = [];
for (let i = 0; i < rawProfiles.length; i++) {
    const p = rawProfiles[i];
    profiles.push({
        id: p.id,
        email: p.attributes ? p.attributes.email : undefined,
        first_name: p.attributes ? p.attributes.first_name : undefined,
        created: p.attributes ? p.attributes.created : undefined,
    });
}

console.log("\n  Klaviyo returned " + profiles.length + " profile(s) (revision " + revision + ").");
show("Sample profiles (trimmed)", profiles);
console.log(
    "  Klaviyo is outbound-only for V1 — the hub pushes events/profiles to\n" +
    "  Klaviyo; this read call is purely to confirm the credential works.\n"
);