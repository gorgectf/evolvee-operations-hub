import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// The scripts live at <root>/docs/scripts/api-tests/, but the credentials live
// in the backend .env. Try the known locations in order and use the first that
// exists. Set ENV_FILE to point somewhere explicit if your layout differs.
const candidateEnvPaths = [
    process.env.ENV_FILE,
    resolve(__dirname, "..", "..", "..", "backend", ".env"),
    resolve(__dirname, "..", "..", "..", ".env"),
    resolve(__dirname, "..", "..", ".env"),
];

function resolveEnvPath() {
    for (let i = 0; i < candidateEnvPaths.length; i++) {
        const candidate = candidateEnvPaths[i];
        if (candidate && existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

const ENV_PATH = resolveEnvPath();

function loadEnvFile(path) {
    if (!existsSync(path)) return;
    
    const text = readFileSync(path, "utf8");
    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("#")) continue;

        const eq = line.indexOf("=");
        if (eq === -1) continue;

        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (!(key in process.env)) process.env[key] = value;
    }
}

if (ENV_PATH) {
    loadEnvFile(ENV_PATH);
}

const PLACEHOLDER = /^(x+|.*xxxx.*|change-me.*|your-.*)$/i;

export function getEnv(key, fallback) {
    const v = process.env[key];

    if (v === undefined || v === "" || PLACEHOLDER.test(v)) return fallback;

    return v;
}

export function requireEnv(...keys) {
    const missing = [];

    for (let i = 0; i < keys.length; i++) {
        if (getEnv(keys[i]) === undefined) {
            missing.push(keys[i]);
        }
    }

    if (missing.length) {
        console.error("\n  Missing credentials — cannot run this test yet.\n");
        console.error("      Add the following to your .env (see .env.example):");

        for (let i = 0; i < missing.length; i++) {
            console.error("        - " + missing[i]);
        }
        
        console.error("\n      Once a value is in .env, re-run this script.\n");
        process.exit(1);
    }
    const result = {};

    for (let i = 0; i < keys.length; i++) {
        result[keys[i]] = process.env[keys[i]];
    }

    return result;
}

export function show(label, data) {
    const json = JSON.stringify(data, null, 2);
    let trimmed;
    if (json.length > 1500) {
        trimmed = json.slice(0, 1500) + "\n  ...(truncated)";
    } else {
        trimmed = json;
    }

    console.log("\n  " + label + "\n");
    console.log(trimmed.replace(/^/gm, "  "));
    console.log("");
}

export async function getJson(url, options) {
    if (options === undefined) options = {};
    const res = await fetch(url, options);
    const text = await res.text();
    let body;

    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        body = text;
    }

    if (!res.ok) {
        console.error("\n  HTTP " + res.status + " " + res.statusText + " from " + url);
        if (typeof body === "string") {
            console.error(body);
        } else {
            console.error(JSON.stringify(body, null, 2).replace(/^/gm, "  "));
        }
        console.error("");
        process.exit(1);
    }

    return body;
}