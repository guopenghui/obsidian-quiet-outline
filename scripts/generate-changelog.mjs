#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Octokit } from "octokit";

/**
 * ========= Config via env =========
 * Required:
 *   GITHUB_TOKEN  - GitHub PAT (classic or fine-grained) with repo read access
 *   GITHUB_OWNER  - e.g. "octocat"
 *   GITHUB_REPO   - e.g. "Hello-World"
 *
 * Optional:
 *   OUTPUT_FILE            - default "CHANGELOG.md"
 *   INCLUDE_PRERELEASE     - "true" to include prereleases (default false)
 *   INCLUDE_DRAFT          - "true" to include drafts (default false)
 *   LIMIT                 - max number of releases to include (default 0 = no limit)
 *   TITLE                 - changelog title (default "Changelog")
 *   APPEND_SOURCE_NOTE    - "true" to add a small footer note (default true)
 */

function env(name, fallback = undefined) {
    const v = process.env[name];
    return v == null || v === "" ? fallback : v;
}

function envBool(name, fallback = false) {
    const v = env(name);
    if (v == null) return fallback;
    return ["1", "true", "yes", "y", "on"].includes(String(v).toLowerCase());
}

function envInt(name, fallback = 0) {
    const v = env(name);
    if (v == null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

/** ---------- Markdown normalization (headings -> make min heading = H3) ---------- */

function isFenceLine(line) {
    // Fenced code blocks start/end with ``` or ~~~ (3+ chars)
    return /^(\s*)(```+|~~~+)/.test(line);
}

function getMinHeadingLevel(md) {
    const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
    let inFence = false;
    let min = Infinity;

    for (const line of lines) {
        if (isFenceLine(line)) inFence = !inFence;
        if (inFence) continue;

        // ATX headings only: "# " .. "###### "
        // Require a space after hashes to reduce false positives.
        const m = /^(#{1,6})\s+/.exec(line);
        if (m) min = Math.min(min, m[1].length);
    }
    return min === Infinity ? null : min;
}

function shiftHeadings(md, delta) {
    const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
    let inFence = false;

    const out = lines.map((line) => {
        if (isFenceLine(line)) {
            inFence = !inFence;
            return line;
        }
        if (inFence) return line;

        const m = /^(#{1,6})\s+/.exec(line);
        if (!m) return line;

        const oldLevel = m[1].length;
        const newLevel = Math.max(1, Math.min(6, oldLevel + delta));
        return "#".repeat(newLevel) + line.slice(oldLevel);
    });

    return out.join("\n");
}

function normalizeBodyToH3(md) {
    md = (md || "").replace(/\r\n/g, "\n").trim();
    if (!md) return md;

    const minLevel = getMinHeadingLevel(md);
    if (minLevel == null) return md; // no headings -> keep as-is

    const delta = 3 - minLevel; // make highest heading become ###
    if (delta === 0) return md;

    return shiftHeadings(md, delta);
}

function normalizeBlankLines(md) {
    // Keep formatting readable, but avoid huge blank stretches
    return (md || "")
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/** ---------- Changelog rendering ---------- */

function formatDateISOToYMD(iso) {
    if (!iso) return "";
    // iso like "2025-12-17T12:34:56Z" -> "2025-12-17"
    return String(iso).slice(0, 10);
}

function releaseDisplayTag(r) {
    // Prefer tag_name; fallback to name
    return r?.tag_name || r?.name || "unknown";
}

function renderReleaseSection(r) {
    const tag = releaseDisplayTag(r);
    const date = formatDateISOToYMD(r.published_at || r.created_at);

    const header = `## ${tag}${date ? ` - ${date}` : ""}\n\n`;

    let body = normalizeBodyToH3(r.body || "");
    body = normalizeBlankLines(body);

    if (!body) body = "_No release notes._";

    return header + body + "\n\n";
}

function buildChangelog({ title, releases, owner, repo, appendSourceNote }) {
    const lines = [];
    lines.push(`# ${title}`);
    lines.push("");
    lines.push(
        "> This file is auto-generated from GitHub Releases. Do not edit by hand.",
    );
    lines.push("");

    for (const r of releases) {
        lines.push(renderReleaseSection(r).trimEnd());
        lines.push(""); // ensure a blank line between releases
    }

    if (appendSourceNote) {
        lines.push("---");
        lines.push("");
        lines.push(`_Generated from releases in \`${owner}/${repo}\`._`);
        lines.push("");
    }

    return lines.join("\n");
}

/** ---------- GitHub API ---------- */

async function fetchAllReleases(octokit, owner, repo) {
    // REST: GET /repos/{owner}/{repo}/releases
    // We'll paginate manually for clarity.
    const per_page = 100;
    let page = 1;
    const all = [];

    while (true) {
        const res = await octokit.rest.repos.listReleases({
            owner,
            repo,
            per_page,
            page,
        });

        const items = res.data || [];
        all.push(...items);

        if (items.length < per_page) break;
        page += 1;
    }
    return all;
}

async function main() {
    const token = env("GITHUB_TOKEN");
    const owner = env("GITHUB_OWNER");
    const repo = env("GITHUB_REPO");

    if (!token) throw new Error("Missing env: GITHUB_TOKEN");
    if (!owner) throw new Error("Missing env: GITHUB_OWNER");
    if (!repo) throw new Error("Missing env: GITHUB_REPO");

    const outputFile = env("OUTPUT_FILE", "CHANGELOG.md");
    const includePrerelease = envBool("INCLUDE_PRERELEASE", false);
    const includeDraft = envBool("INCLUDE_DRAFT", false);
    const limit = envInt("LIMIT", 0);
    const title = env("TITLE", "Changelog");
    const appendSourceNote = envBool("APPEND_SOURCE_NOTE", true);

    const octokit = new Octokit({ auth: token });

    const all = await fetchAllReleases(octokit, owner, repo);

    // Filter and sort newest -> oldest
    let releases = all
        .filter((r) => (includeDraft ? true : !r.draft))
        .filter((r) => (includePrerelease ? true : !r.prerelease))
        .sort((a, b) => {
            const da = new Date(a.published_at || a.created_at || 0).getTime();
            const db = new Date(b.published_at || b.created_at || 0).getTime();
            return db - da;
        });

    if (limit > 0) releases = releases.slice(0, limit);

    const content = buildChangelog({
        title,
        releases,
        owner,
        repo,
        appendSourceNote,
    });

    // Write (ensure folder exists if user sets nested OUTPUT_FILE)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const outPath = path.isAbsolute(outputFile)
        ? outputFile
        : path.join(process.cwd(), outputFile);

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, content, "utf8");

    console.log(`Wrote ${releases.length} releases to: ${outPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
