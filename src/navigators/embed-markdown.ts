import {
    Editor,
    type EmbedMarkdownView,
    MarkdownPreviewRenderer,
} from "obsidian";
import type QuietOutline from "@/plugin";
import { store } from "@/store";
import { Nav } from "./base";
import { calcModifies } from "@/utils/diff";
import { parseMetaDataCache } from "@/utils/md-process";
import type { MarkdownHeading } from "./markdown";

function getHeader(index: number) {
    return store.headers[index] as MarkdownHeading;
}

export class EmbedMarkdownFileNav extends Nav {
    declare view: EmbedMarkdownView;
    constructor(plugin: QuietOutline, view: EmbedMarkdownView) {
        super(plugin, view);
    }
    getId(): string {
        return "embed-markdown-file";
    }
    async jump(key: number): Promise<void> {
        // throw new Error("Method not implemented.");
        // const view = plugin.current_note as EmbedMarkdownView;
        const line = getHeader(key).line;

        // const cursor = {
        // 	from: {line, ch: 0},
        // 	to: {line, ch: 0},
        // };
        // const state = { line, cursor };

        // this.plugin.jumping = true;
        void this.plugin.startJumping();
        this.plugin.outlineView?.vueInstance.onPosChange(key);

        activeWindow.setTimeout(() => {
            // this.view.setEphemeralState(state);
            setEphemeralState(this.view, { line, focus: true });
        });
    }

    async jumpWithoutFocus(key: number): Promise<void> {
        const line = getHeader(key).line;

        // const cursor = {
        // 	from: {line, ch: 0},
        // 	to: {line, ch: 0},
        // };
        // const state = { line, cursor };

        // this.plugin.jumping = true;
        void this.plugin.startJumping();
        this.plugin.outlineView?.vueInstance.onPosChange(key);

        activeWindow.setTimeout(() => {
            // this.view.setEphemeralState(state);
            setEphemeralState(this.view, { line });
        });

    }

    async getHeaders(): Promise<MarkdownHeading[]> {
        if (!this.view.file) { return []; }
        const cache = this.plugin.app.metadataCache.getFileCache(
            this.view.file,
        );
        return (cache?.headings || []).map((h) => ({ level: h.level, title: h.heading, line: h.position.start.line, position: h.position }));
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
}

export class EmbedMarkdownTextNav extends Nav {
    declare view: EmbedMarkdownView;
    constructor(plugin: QuietOutline, view: EmbedMarkdownView) {
        super(plugin, view);
    }
    getId(): string {
        return "embed-markdown-text";
    }
    async jump(index: number): Promise<void> {
        const line = getHeader(index).line;
        setEphemeralState(this.view, { line, focus: true });
    }
    async jumpWithoutFocus(index: number): Promise<void> {
        const line = getHeader(index).line;
        setEphemeralState(this.view, { line });
    }
    async getHeaders(): Promise<MarkdownHeading[]> {
        const { headings } = await parseMetaDataCache(
            this.plugin.app,
            this.view.text,
        );
        return (headings || []).map((h) => ({ ...h, title: h.heading, line: h.position.start.line }));
    }
    async setHeaders(): Promise<void> {
        store.headers = await this.getHeaders();
    }
    async updateHeaders(): Promise<void> {
        const headings = await this.getHeaders();
        store.modifyKeys = calcModifies(store.headers, headings);
        store.headers = headings;
    }
}

function setEphemeralState(view: EmbedMarkdownView, option: { line: number, focus?: boolean; }) {
    if (view.getMode() === "source") {
        editorScroll(view.editMode.editor, option.line);
        if (option.focus) {
            view.editMode.editor.focus();
        }
    } else {
        previewScroll(view.previewMode.renderer, option.line);
        view.previewMode.containerEl.tabIndex = -1;
        if (option.focus) {
            view.previewMode.containerEl.focus();
        }
    }
}

function editorScroll(editor: Editor, line: number) {
    const selection = {
        from: { line, ch: 0 },
        to: { line, ch: editor.getLine(line).length },
    };
    editor.addHighlights([selection], "is-flashing", true, true);
    editor.setCursor(selection.from);
    editor.scrollIntoView(selection, true);
}

function previewScroll(renderer: MarkdownPreviewRenderer, line: number) {
    renderer.applyScroll(line, { highlight: true, center: true });
}
