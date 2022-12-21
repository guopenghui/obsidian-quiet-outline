import fs from "fs";
import process from "process";
import child from "child_process";
import path from "path";

const version = process.argv[2];
const root = process.cwd();

// write version
let manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
manifest.version = version;
fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify(manifest));

child.execSync("git push");
child.execSync(`git tag ${version}`);
child.execSync("git push --tags");

console.log("> Publish succeeded.");
