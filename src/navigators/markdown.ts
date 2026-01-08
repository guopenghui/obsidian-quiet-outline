import {
    type MarkdownPreviewSection,
    type HeadingCache,
    type EditorRange,
    MarkdownView,
    debounce,
    Menu,
    Notice,
} from "obsidian";
import { confirm } from "@/utils/modal";
import { EditorView } from "@codemirror/view";
import { editorEvent } from "@/editorExt";
import type QuietOutline from "@/plugin";
import { store, getSiblings, type Heading } from "@/store";
import { Nav } from "./base";
import { calcModifies } from "@/utils/diff";
import {
    parseMarkdown,
    stringifySection,
    moveHeading,
    removeHeading,
} from "@/utils/md-process";
import type { TreeOption } from "naive-ui";
import { setupMenu, normal, parent, separator, danger } from "@/utils/menu";
import { t } from "@/lang/helper";
import { HeadingUpdater } from "@/utils/update-heading-links";
import { stringifyHeaders } from "@/utils/heading";

let plugin: QuietOutline;
export const MD_DATA_FILE = "markdown-states.json";

export class MarkDownNav extends Nav {
    declare view: MarkdownView;
    canDrop: boolean = true;
    expandedKeys: string[] | undefined;
    constructor(_plugin: QuietOutline, view: MarkdownView) {
        super(_plugin, view);
        plugin = _plugin;
    }

    getId() {
        return "markdown";
    }

    async getHeaders(): Promise<HeadingCache[]> {
        const cache = this.view.file && this.plugin.app.metadataCache.getFileCache(
            this.view.file,
        );
        return structuredClone(cache?.headings) || [];
    }

    async setHeaders(): Promise<void> {
        const headings = await this.getHeaders();
        store.headers = headings;
    }

    async updateHeaders(): Promise<void> {
        const headings = await this.getHeaders();
        store.modifyKeys = calcModifies(store.headers, headings);
        store.headers = headings;
    }

    async jump(key: number) {
        const line: number = store.headers[key].position.start.line;

        const cursor = {
            from: { line, ch: 0 },
            to: { line, ch: 0 },
        };
        const state = { line, cursor };

        this.plugin.jumping = true;
        store.onPosChange(key);

        setTimeout(() => {
            this.view.setEphemeralState(state);

            // 这里假设 jump 一定会 *触发唯一一次* scroll，因此把 jumping = false 的操作交给 handelScroll 函数
            // 以避免 jump 后的 scroll 泄露
            // setTimeout(() => {
            // 	plugin.jumping = false;
            // }, 1000);
        });
    }

    // make clicking behavior consistent with core outline plugin
    // i.e. focus editor
    async jumpWhenClick(key: number): Promise<void> {
        this.jump(key);
    }

    async jumpWithoutFocus(key: number) {
        const line: number = store.headers[key].position.start.line;

        const state = { line };

        this.plugin.jumping = true;
        store.onPosChange(key);

        setTimeout(() => {
            this.view.setEphemeralState(state);

            // 这里假设 jump 一定会 *触发唯一一次* scroll，因此把 jumping = false 的操作交给 handelScroll 函数
            // 以避免 jump 后的 scroll 泄露
            // setTimeout(() => {
            // 	plugin.jumping = false;
            // }, 1000);
        });
    }

    async install() {
        this.plugin.registerEditorExtension([editorEvent]);

        // support multiple windows
        // this.plugin.registerEvent(plugin.app.workspace.on("window-open", (spaceWin, win) => {
        // 	spaceWin.doc.addEventListener("scroll", handleScroll, true);
        // }));
        // this.plugin.registerEvent(plugin.app.workspace.on("window-close", (spaceWin, win) => {
        // 	spaceWin.doc.removeEventListener("scroll", handleScroll, true);
        // }));
    }

    async onload() {
        // @ts-ignore
        this.registerDomEvent(
            document,
            "quiet-outline-cursorchange",
            handleCursorChange,
        );
        this.registerDomEvent(
            this.view.contentEl,
            "scroll",
            handleScroll,
            true,
        );
    }

    async onunload() { }

    toBottom(): void {
        const lines = this.view.data.split("\n");
        const scroll = () => {
            // For some reason, scrolling to last 4 lines gets an error.
            this.view.setEphemeralState({ line: lines.length - 5 });
        };

        scroll();
        setTimeout(scroll, 100);
    }

    getDefaultLevel(): number {
        let level;
        if (this.view.file) {
            const cache = this.plugin.app.metadataCache.getFileCache(this.view.file);
            level = cache?.frontmatter?.["qo-default-level"];
            if (typeof level === "string") {
                level = parseInt(level);
            }
        }

        return level || parseInt(plugin.settings.expand_level);
    }

    getPath(): string {
        return this.view.file?.path ?? "";
    }

    onExpandKeysChange(path: string, keys: string[]) {
        if (path === this.view.file?.path) {
            this.expandedKeys = keys;
            this.storeMarkdownState();
        }
    }

    changeHeadingContent(no: number, content: string) {
        if (!content || !this.view.file) return;

        const updater = new HeadingUpdater(
            this.view.app,
            this.view.file,
            this.view.editor,
            {
                start: store.headers[no].position.start.offset,
                end: store.headers[no].position.end.offset,
            },
            store.headers[no].heading,
        );
        updater.updateHeadingLinks(content);
        store.headers[no].heading = content;
    }

    /**
     * Change the level of a heading.
     * @param index The index of the heading.
     * @param level The new level of the heading. If provided `level` is less than 1 or greater than 5,
     * the function does nothing.
     */
    changeHeadingLevel(index: number, level: number) {
        if (level < 1 || level > 6) { return; }

        const lineNo = store.headers[index].position.start.line;
        store.headers[index].level = level;
        this.view.editor.setLine(lineNo, `${"#".repeat(level)} ${store.headers[index].heading}`);
    }

    async handleDrop(
        from: number,
        to: number,
        position: "before" | "after" | "inside",
    ) {
        const structure = await parseMarkdown(this.view.data, this.view.app);
        moveHeading(structure, from, to, position);

        if (!this.view.file) return;
        await plugin.app.vault.modify(
            this.view.file,
            stringifySection(structure),
        );
    }

    onRightClick(
        event: MouseEvent,
        nodeInfo: { node: TreeOption; no: number; level: number; raw: string; },
        menu: Menu,
        onClose?: () => void,
    ): void {
        setupMenu(menu, [
            parent(t("Copy"), [
                normal(t("Heading"), async () => {
                    await navigator.clipboard.writeText(nodeInfo.raw);
                }),
                normal(t("Heading and siblings headings"), async () => {
                    const { no } = nodeInfo;
                    const headers = stringifyHeaders(store.headers, this.plugin.settings.export_format)
                        .map((s) => s.slice(store.headers[no].level - 1));
                    const siblingSet = getSiblings(no, store.headers);
                    const siblings = headers.filter((_, i) =>
                        siblingSet.has(i),
                    );

                    await navigator.clipboard.writeText(siblings.join("\n"));
                }),
                normal(t("Heading and children headings"), async () => {
                    const { no, level } = nodeInfo;

                    let headers = stringifyHeaders(store.headers, this.plugin.settings.export_format);
                    headers = headers.map(s =>
                        s.slice(store.headers[no].level - 1),
                    );

                    let slice: string[] = [headers[no]];
                    for (let i = no + 1; i < store.headers.length; i++) {
                        if (store.headers[i].level <= level) {
                            break;
                        }
                        slice.push(headers[i]);
                    }

                    await navigator.clipboard.writeText(slice.join("\n"));
                }),
                normal(t("Link of heading"), async () => {
                    if (!this.view.file) return;

                    const link = this.plugin.app.fileManager.generateMarkdownLink(this.view.file, "", "#" + nodeInfo.raw);
                    await navigator.clipboard.writeText(link);
                }),
                normal(t("Heading and Content"), async () => {
                    const { no, level } = nodeInfo;
                    let i = no + 1;
                    for (; i < store.headers.length; i++) {
                        if (store.headers[i].level <= level) {
                            break;
                        }
                    }

                    const text = this.view.data.slice(
                        store.headers[no].position.start.offset,
                        store.headers[i]?.position.start.offset ||
                        this.view.data.length,
                    );
                    await navigator.clipboard.writeText(text);
                }),
            ]),
            separator(),
            parent(t("Change Level"), [
                normal(t("Increase"), () => {
                    this.changeHeadingLevel(nodeInfo.no, nodeInfo.level + 1);
                }),
                normal(t("Increase Recursively"), async () => {
                    // get this header and its descendants
                    const headersToModify: (Heading & { no: number; })[] = [];
                    let maxLevel = 0;
                    for (let i = nodeInfo.no; i < store.headers.length; i++) {
                        const header = store.headers[i];
                        if (header.level <= nodeInfo.level && i !== nodeInfo.no) break;
                        headersToModify.push({ ...header, no: i });
                        maxLevel = Math.max(maxLevel, header.level);
                    }

                    // Maximum level is H6, do not allow further increase
                    if (maxLevel >= 6) {
                        new Notice(t("Maximum level reached"));
                        return;
                    }

                    headersToModify.forEach(header => {
                        this.changeHeadingLevel(header.no, header.level + 1);
                    });
                }),
                normal(t("Decrease"), () => {
                    this.changeHeadingLevel(nodeInfo.no, nodeInfo.level - 1);
                }),
                normal(t("Decrease Recursively"), async () => {
                    // get this header and its descendants
                    const headersToModify: (Heading & { no: number; })[] = [];
                    let minLevel = Number.MAX_SAFE_INTEGER;
                    for (let i = nodeInfo.no; i < store.headers.length; i++) {
                        const header = store.headers[i];
                        if (header.level <= nodeInfo.level && i !== nodeInfo.no) break;
                        headersToModify.push({ ...header, no: i });
                        minLevel = Math.min(minLevel, header.level);
                    }

                    // Minimum level is H1, do not allow further decrease
                    if (minLevel <= 1) {
                        new Notice(t("Minimum level reached"));
                        return;
                    }

                    headersToModify.forEach(header => {
                        this.changeHeadingLevel(header.no, header.level - 1);
                    });
                }),
            ]),
            normal(t("Rename heading"), async () => {
                store.currentEditingKey = nodeInfo.node.key as string;
            }),
            danger(t("Delete"), async () => {
                // Deleting will modify the note content. Ask user to confirm before proceeding.
                // Include which heading is being deleted to reduce accidental deletions.
                const headingText = nodeInfo.raw;

                // i18n note:
                // `t()` in this project does NOT support interpolation options.
                // To keep it compatible, we translate a stable prefix/suffix and then insert the heading text.
                const message = `${t("This will delete heading:")} ${headingText}\n\n${t("This will modify the note content. Continue?")}`;

                const ok = await confirm(this.view.app, {
                    title: t("Confirm"),
                    message,
                    confirmText: t("Delete"),
                    cancelText: t("Cancel"),
                    confirmIcon: "trash",
                    cancelIcon: "x",
                });

                if (!ok) return;

                const structure = await parseMarkdown(this.view.data, this.view.app);
                removeHeading(structure, nodeInfo.no);

                if (!this.view.file) {
                    new Notice("No file in markdown view");
                    return;
                }

                await plugin.app.vault.modify(
                    this.view.file,
                    stringifySection(structure),
                );
            })
        ]);

        menu.onHide(onClose || (() => { }));
        menu.showAtMouseEvent(event);
    }

    async loadMarkdownState() {
        return plugin.data_manager.loadFileData<MarkdownStates>(MD_DATA_FILE, {});
    }

    storeMarkdownState() {
        const view = this.view;
        if (!view.file?.path) return;

        const dataMap = plugin.data_manager.getData<MarkdownStates>(MD_DATA_FILE) || {};
        const oldData = dataMap[view.file.path] || {};
        const keysToSave = this.expandedKeys || dataMap[view.file.path]?.expandedKeys || [];
        const data: MarkdownState = Object.assign({}, DEFAULT_STATE, oldData, {
            expandedKeys: keysToSave,
            ...view.getEphemeralState()
        });

        dataMap[view.file.path] = data;
        plugin.data_manager.saveFileData(MD_DATA_FILE, dataMap); // <MarkdownStates>
    }

}

function handleCursorChange(e?: CustomEvent) {
    if (plugin.settings.persist_md_states) {
        (plugin.navigator as MarkDownNav).storeMarkdownState();
    }

    if (!plugin.allow_cursor_change || plugin.jumping || e?.detail.docChanged) {
        return;
    }

    if (plugin.settings.locate_by_cursor) {
        // fix conflict with cursor-change and scroll both triggering highlight heading change
        plugin.block_scroll();

        const current = currentLine(false, true);
        const index = nearestHeading(current);
        if (index === undefined) return;

        store.onPosChange(index);
    }
}

type MarkdownState = {
    scroll: number,
    cursor: EditorRange,
    expandedKeys: string[],
};

const DEFAULT_STATE: MarkdownState = Object.freeze({
    scroll: 0,
    cursor: {
        from: { line: 0, ch: 0 },
        to: { line: 0, ch: 0 },
    },
    expandedKeys: [],
});

export type MarkdownStates = Record<string, MarkdownState>;

function currentLine(fromScroll: boolean, isSourcemode: boolean) {
    const markdownView  = (plugin.navigator as MarkDownNav).view;
    // there could be no editor on a markdown view when this view is initializing
    if (!markdownView.editor) {
        return 0;
    }

    if (plugin.settings.locate_by_cursor && !fromScroll) {
        return isSourcemode
            ? markdownView.editor.getCursor("from").line
            : Math.ceil(markdownView.previewMode.getScroll());
    } else {
        return isSourcemode
            ? // @ts-ignore
            getCurrentLineFromEditor(markdownView.editor.cm)
            : getCurrentLineFromPreview(markdownView);
    }
}

// line above and nearest to middle of the editor
function getCurrentLineFromEditor(editorView: EditorView): number {
    const { y, height } = editorView.dom.getBoundingClientRect();
    const middle = y + height / 2;
    const lineBlocks = editorView.viewportLineBlocks;

    let line: number = 0;
    lineBlocks.forEach((lb) => {
        const node = editorView.domAtPos(lb.from).node;
        const el = (
            node.nodeName == "#text" ? node.parentNode : node
        ) as HTMLElement;
        const elRect = el.getBoundingClientRect();
        const base = elRect.y + elRect.height / 2;

        if (base <= middle) {
            line = editorView.state.doc.lineAt(lb.from).number;
        }
    });

    return Math.max(line - 2, 0);
}

function getCurrentLineFromPreview(view: MarkdownView): number {
    const renderer = view.previewMode.renderer;
    const previewEl = (renderer as any).previewEl as HTMLElement;
    const rect = previewEl.getBoundingClientRect();
    const middle = rect.y + rect.height / 2;

    const elsInViewport = previewEl.querySelectorAll(
        ".markdown-preview-sizer>div[class|=el]",
    );

    let line: number = 0;
    elsInViewport.forEach((el) => {
        const { y } = el.getBoundingClientRect();
        if (y <= middle) {
            const section = (renderer as any).getSectionForElement(el,) as MarkdownPreviewSection;
            line = section.lineStart  // this property has been removed since Obsidian v1.9.0
                || section.start.line;
        }
    });

    return line;
}

function nearestHeading(line: number): undefined | number {
    let current_heading = null;
    let i = store.headers.length;
    while (--i >= 0) {
        if (store.headers[i].position.start.line <= line) {
            current_heading = store.headers[i];
            break;
        }
    }
    if (!current_heading) {
        return;
    }

    return i;
}

const handleScroll = debounce(_handleScroll, 150, false);

function _handleScroll(evt: Event) {
    if (plugin.settings.persist_md_states) {
        (plugin.navigator as MarkDownNav).storeMarkdownState();
    }

    if (!plugin.allow_scroll) {
        return;
    }

    if (plugin.jumping) {
        plugin.jumping = false;
        return;
    }

    const target = evt.target as HTMLElement;
    if (
        !target.classList.contains("markdown-preview-view") &&
        !target.classList.contains("cm-scroller") &&
        // fix conflict with outliner
        // https://github.com/guopenghui/obsidian-quiet-outline/issues/133
        !target.classList.contains("outliner-plugin-list-lines-scroller")
    ) {
        return;
    }

    const isSourcemode =
        (plugin.navigator as MarkDownNav).view.getMode() === "source";

    const current = currentLine(true, isSourcemode);
    const index = nearestHeading(current);
    if (index === undefined) return;

    store.onPosChange(index);
}
