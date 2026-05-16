import {
    App, Notice, stringifyYaml, parseYaml, getFrontMatterInfo,
    stripHeading, stripHeadingForLink, getLinkpath, parseLinktext, TFile, Editor
} from 'obsidian';

interface TokenRange {
    start: number;
    end: number;
    text?: string;
}

type MutableRecord = Record<string, unknown>;

interface LinkReference {
    link: string;
    original: string;
    position?: {
        start: { offset: number; };
        end: { offset: number; };
    };
    key?: string;
}

interface LinkChange {
    sourcePath: string;
    reference: LinkReference;
    change: string;
}

interface AliasProtector {
    contains(alias: string): boolean;
}

function isMutableRecord(value: unknown): value is MutableRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

class LinkChangesCollection {
    data: Map<string, LinkChange[]> = new Map();

    count(): number {
        let total = 0;
        for (const changes of this.data.values()) {
            total += changes.length;
        }
        return total;
    }

    clear(path: string): void {
        this.data.delete(path);
    }

    add(path: string, change: LinkChange): void {
        if (!this.data.has(path)) {
            this.data.set(path, []);
        }
        this.data.get(path)!.push(change);
    }

    get(path: string): LinkChange[] | undefined {
        return this.data.get(path);
    }

    keys() {
        return Array.from(this.data.keys());
    }
}

export class HeadingUpdater {
    constructor(
        private app: App,
        private file: TFile,
        private editor: Editor,
        private tokenRange: TokenRange,
        private oldHeading: string,
    ) { }

    async updateHeadingLinks(content: string) {
        if (!content) {
            return false;
        }

        const changes = this.getChanges(content);
        const fileCount = changes.data.size;
        const linkCount = changes.count();

        // deal with self reference
        const fileChanges = changes.get(this.file.path) || [];
        if (fileChanges.length > 0) {
            changes.clear(this.file.path);
        }
        const fileReplacement = this.replaceInFile(content);
        const linkData = {
            link: "",
            original: "",
            position: {
                start: {
                    line: 0,
                    col: 0,
                    offset: fileReplacement.start
                },
                end: {
                    line: 0,
                    col: 0,
                    offset: fileReplacement.end
                }
            }
        };

        fileChanges.push({
            sourcePath: this.file.path,
            change: fileReplacement.text,
            reference: linkData
        });

        await this.app.vault.process(this.file, (content: string) => {
            return applyFileChanges(content, fileChanges);
        });

        await this.app.fileManager.updateInternalLinks(changes);

        const linkText = i18next.t("nouns.link-with-count", { count: linkCount });
        const fileText = i18next.t("nouns.file-with-count", { count: fileCount });
        const message = i18next.t("dialogue.msg-updated-links", { links: linkText, files: fileText });

        new Notice(message);
    }

    private getChanges(content: string) {
        const metadataCache = this.app.metadataCache;
        const changes = new LinkChangesCollection();
        const oldHeadingLower = stripHeading(this.oldHeading).toLowerCase();
        const newHeadingSlug = stripHeadingForLink(content);

        this.app.fileManager.iterateAllRefs((sourcePath: string, reference: unknown) => {
            if (!isLinkReference(reference)) {
                return;
            }

            const linkInfo = parseLinktext(reference.link);
            const linkPath = linkInfo.path;
            const subpath = linkInfo.subpath;

            if (subpath && stripHeading(subpath.substring(1)).toLowerCase() === oldHeadingLower) {
                const targetFile = metadataCache.getFirstLinkpathDest(linkPath, sourcePath);
                if (targetFile === this.file) {
                    changes.add(sourcePath, {
                        sourcePath: sourcePath,
                        reference: reference,
                        change: SL(reference, linkPath + "#" + newHeadingSlug)
                    });
                }
            }
        });

        return changes;
    }

    private replaceInEditor(value: string): void {
        const tokenRange = this.tokenRange;
        const editor = this.editor;
        const startPos = editor.offsetToPos(tokenRange.start);
        const lineContent = editor.getLine(startPos.line);
        const newLine = this.replaceHeadingText(lineContent, value);
        editor.setLine(startPos.line, newLine);
    }

    private replaceInFile(value: string): TokenRange & { text: string; } {
        const tokenRange = this.tokenRange;
        const editor = this.editor;
        const startPos = editor.offsetToPos(tokenRange.start);
        const lineContent = editor.getLine(startPos.line);
        const newLine = this.replaceHeadingText(lineContent, value);

        return {
            ...tokenRange,
            text: newLine
        };
    }

    private replaceHeadingText(line: string, newText: string): string {
        return line.replace(/^(#{1,6} ).*/m, (_match: string, headingMark: string) => {
            return headingMark + newText;
        });
    }

    private getCustomReplacements(value: string) {
        return {
            oldSubpath: stripHeading(this.oldHeading).toLowerCase(),
            newSubpath: stripHeadingForLink(value)
        };
    }
}

/**
 * Type guard for position-based references
 */
function isPositionReference(reference: unknown): reference is LinkReference & Required<Pick<LinkReference, "position">> {
    if (!isMutableRecord(reference) || !isMutableRecord(reference.position)) {
        return false;
    }

    const position = reference.position;
    return (
        isMutableRecord(position.start) &&
        isMutableRecord(position.end) &&
        typeof position.start.offset === "number" &&
        typeof position.end.offset === "number"
    );
}

/**
 * Type guard for key-based references
 */
function isKeyReference(reference: unknown): reference is { key: string; } {
    return isMutableRecord(reference) && typeof reference.key === "string";
}

function isLinkReference(reference: unknown): reference is LinkReference {
    return (
        isMutableRecord(reference) &&
        typeof reference.link === "string" &&
        typeof reference.original === "string"
    );
}

function isAliasProtector(value: unknown): value is AliasProtector {
    return (
        isMutableRecord(value) &&
        typeof value.contains === "function"
    );
}

/**
 * Sets a nested property value in an object
 */
function setNestedProperty(obj: unknown, path: string[], value: unknown): void {
    let target = obj;
    while (target && path.length) {
        const key = path.shift()!;
        if (Array.isArray(target)) {
            const index = parseInt(key);
            if (isNaN(index) || index < 0 || index >= target.length) {
                return;
            }
            if (!(path.length > 0)) {
                target[index] = value;
                return;
            }
            target = target[index];
        } else {
            if (!isMutableRecord(target)) {
                return;
            }
            if (!(path.length > 0)) {
                target[key] = value;
                return;
            }
            if (!isMutableRecord(target[key]) && !Array.isArray(target[key])) {
                target[key] = {};
            }
            target = target[key];
        }
    }
}

/**
 * Applies content and frontmatter changes to a file
 */
function applyFileChanges(content: string, changes: LinkChange[]): string {
    const positionChanges: Array<{ start: number, end: number, text: string; }> = [];
    const frontmatterChanges: Array<{ key: string, value: unknown; }> = [];

    for (const change of changes) {
        if (isPositionReference(change.reference)) {
            const position = change.reference.position;
            positionChanges.push({
                start: position.start.offset,
                end: position.end.offset,
                text: change.change
            });
        } else if (isKeyReference(change.reference)) {
            frontmatterChanges.push({
                key: change.reference.key,
                value: change.change
            });
        }
    }

    // Apply position-based changes
    if (positionChanges.length > 0) {
        positionChanges.sort((a, b) => b.start - a.start);
        for (const change of positionChanges) {
            content = content.substring(0, change.start) + change.text + content.substring(change.end);
        }
    }

    // If no frontmatter changes, return early
    if (frontmatterChanges.length === 0) {
        return content;
    }

    // Parse and update frontmatter
    const frontmatterInfo = getFrontMatterInfo(content);
    if (!frontmatterInfo.exists) {
        return content;
    }

    let frontmatterObj: unknown;
    try {
        frontmatterObj = parseYaml(frontmatterInfo.frontmatter);
    } catch {
        return content;
    }

    if (!isMutableRecord(frontmatterObj) && !Array.isArray(frontmatterObj)) {
        return content;
    }

    // Apply frontmatter changes
    for (const change of frontmatterChanges) {
        setNestedProperty(frontmatterObj, change.key.split("."), change.value);
    }

    const newFrontmatter = stringifyYaml(frontmatterObj);
    return content.slice(0, frontmatterInfo.from) + newFrontmatter + content.slice(frontmatterInfo.to);
}

const wikiLinkReg = /^(!?\[\[)(.*?)(\|(.*))?(]])$/;
const mdLinkReg = /^(!?\[)(.*?)(]\(\s*)((<[^>]*?>|[^ "]+?)(\s+([^ ]+|"[^"]+"|'[^']+'|\([^']+\)))?)?(\s*\))$/;

/**
 * 更新 Markdown 链接的函数
 *
 * @param reference 包含原始文本和当前链接信息的对象
 * @param newPath 新的链接路径或目标
 * @param protectedAliases 用于判断是否需要更新别名
 * @returns 更新后的 Markdown 字符串
 */
function SL(reference: LinkReference, newPath: string, protectedAliases?: unknown): string {
    let result: string;
    const originalText = reference.original;
    const currentLink = reference.link;

    // 尝试匹配 Wiki 风格链接 (例如 [[Link|Alias]])
    const wikiMatch = originalText.match(wikiLinkReg);

    if (wikiMatch) {
        const prefix = wikiMatch[1];
        const linkId = wikiMatch[2]; // 链接核心部分
        const aliasGroup = wikiMatch[4];
        let alias = aliasGroup === undefined ? "" : aliasGroup;
        const suffix = wikiMatch[5];

        if (alias) {
            // 如果存在别名 (例如 [[File|Alias]])
            const pipeChar = /\\\|/.test(originalText) ? "\\|" : "|";
            const trimmedAlias = alias.trim();

            // 逻辑：检查是否应该更新别名
            // 如果别名和实际文件名字相同，则同时更新链接中的文件名和别名部分
            const isAliasMatchingLink = normalizeFilename(linkId) === trimmedAlias;
            const isAliasProtected = isAliasProtector(protectedAliases)
                && protectedAliases.contains(trimmedAlias);

            if (isAliasMatchingLink && !isAliasProtected) {
                alias = normalizeFilename(getLinkpath(newPath));
            }

            result = `${prefix}${newPath}${pipeChar}${alias}${suffix}`;
        } else {
            // 没有别名，直接替换链接部分
            result = prefix + newPath + suffix;
        }
    } else {
        // 处理标准 Markdown 链接 (例如 [Text](Url)) 或图片
        const mdMatch = originalText.match(mdLinkReg);

        // 判断 URL 是否需要尖括号 <> 包裹
        // 如果不是 MD 链接，或者是 MD 链接且 URL 部分没有以 < 开头，则使用  encodeLinkText 处理
        const formattedUrl = (!mdMatch || !mdMatch[5].startsWith("<"))
            ? encodeLinkText(newPath)
            : `<${newPath}>`;

        if (mdMatch) {
            const prefix = mdMatch[1]; // [
            let linkText = mdMatch[2]; // 链接显示的文本
            const midSeparator = mdMatch[3]; // ](
            const titlePart = mdMatch[6] ?? ""; // 可能存在的 title 属性
            const suffix = mdMatch[8]; // )

            const trimmedLinkText = replaceSpaces(linkText).trim();

            // 计算当前链接的基础名称，用于比较
            const currentBaseName = getLinkpath(currentLink);

            // 逻辑：如果链接文本与当前链接的文件名一致，则更新链接文本
            if (trimmedLinkText === normalizeFilename(currentBaseName)) {
                linkText = normalizeFilename(getLinkpath(newPath));
            } else if (trimmedLinkText.includes("/") && trimmedLinkText === removeMdExtensionIfPresent(currentBaseName)) {
                // 处理包含路径分隔符的情况
                linkText = removeMdExtensionIfPresent(getLinkpath(newPath));
            }

            result = prefix + linkText + midSeparator + formattedUrl + titlePart + suffix;
        } else {
            // 如果既不是 Wiki 链接也不是标准 MD 链接匹配（可能是纯文本转链接的 fallback）
            result = `[](${formattedUrl})`;

            // 如果原始文本看起来像图片引用 (! 开头)，保留感叹号
            if (originalText.startsWith("!")) {
                result = "!" + result;
            }
        }
    }

    return result;
}

function encodeLinkText(text: string) {
    // Percent-encode characters that are unsafe in Obsidian link targets:
    // backslash, spaces, and C0 control characters except common whitespace
    // characters that Obsidian links already handle separately.
    return [...text].map((char) => {
        const code = char.charCodeAt(0);
        const shouldEncode =
            char === "\\" ||
            char === " " ||
            code === 0x00 ||
            code === 0x08 ||
            code === 0x0B ||
            code === 0x0C ||
            (code >= 0x0E && code <= 0x1F);

        return shouldEncode ? encodeURIComponent(char) : char;
    }).join("");
}

/**
 * 从文件路径中提取文件名（不包含目录路径）
 */
function getFileName(filePath: string): string {
    const lastSlashIndex = filePath.lastIndexOf("/");
    return lastSlashIndex === -1 ? filePath : filePath.slice(lastSlashIndex + 1);
}

/**
 * 从文件名中移除扩展名
 */
function getFileNameWithoutExtension(fileName: string): string {
    fileName = getFileName(fileName);
    const lastDotIndex = fileName.lastIndexOf(".");

    // 如果没有扩展名，或者点在开头/结尾，返回原文件名
    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1 || lastDotIndex === 0) {
        return fileName;
    }

    return fileName.substring(0, lastDotIndex);
}

/**
 * 获取文件扩展名（小写）
 */
function getFileExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf(".");

    // 如果没有扩展名，或者点在开头/结尾，返回空字符串
    if (lastDotIndex === -1 || lastDotIndex === filePath.length - 1 || lastDotIndex === 0) {
        return "";
    }

    return filePath.substring(lastDotIndex + 1).toLowerCase();
}

/**
 * 从完整文件路径中移除扩展名
 */
function removeFileExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf(".");

    // 如果没有扩展名，或者点在开头/结尾，返回原路径
    if (lastDotIndex === -1 || lastDotIndex === filePath.length - 1 || lastDotIndex === 0) {
        return filePath;
    }

    return filePath.substring(0, lastDotIndex);
}

/**
 * 规范化显示文本：如果是markdown文件，显示时移除扩展名
 */
function normalizeFilename(filePath: string): string {
    const fileName = getFileName(filePath);
    const extension = getFileExtension(fileName);

    return extension === "md" ? getFileNameWithoutExtension(fileName) : fileName;
}

/**
 * 如果是markdown文件，从完整路径中移除扩展名
 */
function removeMdExtensionIfPresent(filePath: string): string {
    const fileName = getFileName(filePath);
    const extension = getFileExtension(fileName);

    return extension === "md" ? removeFileExtension(filePath) : filePath;
}

const weirdSpaces = /\u00A0|\u202F/g;
function replaceSpaces(text: string) {
    return text.replace(weirdSpaces, " ");
}
