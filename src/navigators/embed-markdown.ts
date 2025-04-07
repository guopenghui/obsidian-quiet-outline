import {Editor, EmbedMarkdownView, HeadingCache, MarkdownPreviewRenderer} from "obsidian";
import type {QuietOutline} from "@/plugin";
import { store } from '@/store';
import {Nav} from "./base";
import {calcModifies} from "@/utils/diff";
import {parseMetaDataCache} from "@/utils/md-process";

export class EmbedMarkdownFileNav extends Nav {
	view: EmbedMarkdownView;
	constructor(plugin: QuietOutline, view: EmbedMarkdownView) {
		super(plugin);
		this.view = view;
	}
	getId(): string {
		return "embed-markdown-file";
	}
	async jump(key: number): Promise<void> {
		// throw new Error("Method not implemented.");
		// const view = plugin.current_note as EmbedMarkdownView;
		const line = store.headers[key].position.start.line;

		// const cursor = {
		// 	from: {line, ch: 0},
		// 	to: {line, ch: 0},
		// };
		// const state = { line, cursor };
		
		this.plugin.jumping = true;
		store.onPosChange(key);

		setTimeout(() => {
			// this.view.setEphemeralState(state);
			setEphemeralState(this.view, {line});

			// 这里假设 jump 一定会 *触发唯一一次* scroll，因此把 jumping = false 的操作交给 handelScroll 函数
			// 以避免 jump 后的 scroll 泄露
			// setTimeout(() => {
			// 	plugin.jumping = false;
			// }, 1000);
		})
	}
	async getHeaders(): Promise<HeadingCache[]> {
		const cache = this.plugin.app.metadataCache.getFileCache(this.view.file);
		return cache?.headings || [];
	}
	async setHeaders(): Promise<void> {
		const headings = await this.getHeaders();
		store.headers = headings;		
	}
	async updateHeaders(): Promise<void> {
		const headings = await this.getHeaders()
		store.modifyKeys = calcModifies(store.headers, headings);
		store.headers = headings;
	}
}

export class EmbedMarkdownTextNav extends Nav {
	view: EmbedMarkdownView;
	constructor(plugin: QuietOutline, view: EmbedMarkdownView) {
		super(plugin);
		this.view = view;
	}
	getId(): string {
		return "embed-markdown-text";
	}
	async jump(key: number): Promise<void> {
		const line = store.headers[key].position.start.line;
		setEphemeralState(this.view, {line});
	}
	async getHeaders(): Promise<HeadingCache[]> {
		const { headings } = await parseMetaDataCache(this.plugin.app, this.view.text);
		return headings || [];
	}
	async setHeaders(): Promise<void> {
		store.headers = await this.getHeaders();
	}
	async updateHeaders(): Promise<void> {
		const headings = await this.getHeaders()
		store.modifyKeys = calcModifies(store.headers, headings);
		store.headers = headings;
	}
}

function setEphemeralState(view: EmbedMarkdownView, option: {line: number}) {
	if (view.getMode() === "source") {
		editorScroll(view.editMode.editor, option.line);
	} else {
		previewScroll(view.previewMode.renderer, option.line);	
	}	
}

function editorScroll(editor: Editor, line: number) {
	const selection = {
		from: { line, ch: 0 },
		to: { line, ch: editor.getLine(line).length },
	}
	editor.addHighlights([selection], "is-flashing", true, true);
	editor.setCursor(selection.from);
	editor.scrollIntoView(selection, true);	
}

function previewScroll(renderer: MarkdownPreviewRenderer, line: number) {
	renderer.applyScroll(line, {highlight: true, center: true});	
}
