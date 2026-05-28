import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const BINARY_EXTENSIONS = /\.(gif|ico|jpe?g|mp4|pdf|png|ttf|webp|woff2?|zip)$/i;
const mode = process.argv[2] || "--check-staged";

function git(args, options = {}) {
    return execFileSync("git", args, {
        encoding: options.encoding ?? "utf8",
        stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    });
}

function splitNull(output) {
    return output.split("\0").filter(Boolean);
}

function unique(files) {
    return [...new Set(files)];
}

function isBinary(buffer, file) {
    return BINARY_EXTENSIONS.test(file) || buffer.includes(0);
}

function hasCrlf(buffer) {
    for (let index = 0; index < buffer.length - 1; index++) {
        if (buffer[index] === 13 && buffer[index + 1] === 10) return true;
    }
    return false;
}

function checkStaged() {
    const stagedFiles = splitNull(
        git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]),
    );
    const filesWithCrlf = [];

    for (const file of stagedFiles) {
        const buffer = git(["show", `:${file}`], { encoding: "buffer" });
        if (!isBinary(buffer, file) && hasCrlf(buffer)) {
            filesWithCrlf.push(file);
        }
    }

    if (filesWithCrlf.length === 0) {
        console.log("Line ending check passed: staged text files use LF.");
        return;
    }

    console.error("CRLF line endings found in staged text files:");
    for (const file of filesWithCrlf) {
        console.error(`  ${file}`);
    }
    console.error("");
    console.error(
        "Run `npm run eol:fix-modified`, review the changes, then stage them again.",
    );
    process.exit(1);
}

function fixFiles(files, label) {
    let changed = 0;

    for (const file of files) {
        if (!existsSync(file)) continue;

        const buffer = readFileSync(file);
        if (isBinary(buffer, file) || !hasCrlf(buffer)) continue;

        const normalized = buffer
            .toString("utf8")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n");
        writeFileSync(file, normalized, "utf8");
        changed++;
    }

    console.log(
        `Normalized ${changed} ${label} text file${changed === 1 ? "" : "s"} to LF.`,
    );
}

function fixWorktree() {
    fixFiles(splitNull(git(["ls-files", "-z"])), "tracked");
    console.log(
        "Review the changes, then run `git add --renormalize .` or stage the intended files.",
    );
}

function fixModified() {
    const unstagedFiles = splitNull(
        git(["diff", "--name-only", "--diff-filter=ACMR", "-z"]),
    );
    const stagedFiles = splitNull(
        git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]),
    );

    fixFiles(unique([...unstagedFiles, ...stagedFiles]), "modified");
    console.log("Review the changes, then stage the intended files.");
}

switch (mode) {
    case "--check-staged":
        checkStaged();
        break;
    case "--fix":
        fixWorktree();
        break;
    case "--fix-modified":
        fixModified();
        break;
    default:
        console.error(`Unknown mode: ${mode}`);
        console.error("Use --check-staged, --fix, or --fix-modified.");
        process.exit(2);
}
