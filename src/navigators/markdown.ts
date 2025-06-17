import {MarkdownView, MarkdownPreviewSection, HeadingCache, debounce, Menu, Notice} from "obsidian";
import { EditorView } from "@codemirror/view";
import { editorEvent } from "@/editorExt"
import type {QuietOutline} from "@/plugin";
import {store, getSiblings} from "@/store";
import {Nav} from "./base";
import {calcModifies} from "@/utils/diff";
import {parseMarkdown, stringifySection, moveHeading} from "@/utils/md-process";
import { TreeProps } from "naive-ui";
import { setupMenu, normal, parent, separator } from "@/utils/menu";
import { t } from "@/lang/helper";

let plugin: QuietOutline;

export class MarkDownNav extends Nav {
	declare view: MarkdownView;
	canDrop: boolean = true;
	constructor(_plugin: QuietOutline, view: MarkdownView) {
		super(_plugin, view);
		plugin = _plugin;
	}
	
	getId() {
		return "markdown";
	}
	
	async getHeaders(): Promise<HeadingCache[]> {
		const cache = this.plugin.app.metadataCache.getFileCache(this.view.file!);
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

	async jump(key: number) {
		const line: number = store.headers[key].position.start.line;

		const cursor = {
			from: {line, ch: 0},
			to: {line, ch: 0},
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
		})

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
		this.registerDomEvent(document, "quiet-outline-cursorchange", handleCursorChange);
		this.registerDomEvent(this.view.contentEl, "scroll", handleScroll, true);
	}
	
	async onunload() {
		
	}
	
	toBottom(): void {
		const lines = this.view.data.split("\n");
		const scroll = () => {
			// For some reason, scrolling to last 4 lines gets an error.
			this.view.setEphemeralState({ line: lines.length - 5 });
		}

		scroll();
		setTimeout(scroll, 100);
	}
	
	getDefaultLevel(): number {
		let level;
		const cache = this.plugin.app.metadataCache.getFileCache(this.view.file!)
		level = cache?.frontmatter?.["qo-default-level"];
		if(typeof level === "string") {
			level = parseInt(level)
		}
		
		return level || parseInt(plugin.settings.expand_level);
	}
	
	getPath(): string {
		return this.view.file!.path;
	}
	
	async handleDrop(from: number, to: number, position: "before" | "after" | "inside"){
		const structure = await parseMarkdown(this.view.data);
		moveHeading(structure, from, to, position);
		await plugin.app.vault.modify(this.view.file!, stringifySection(structure));
	}
	
	onRightClick(
		event: MouseEvent,
		nodeInfo: { node: TreeProps; no: number; level: number; raw: string; },
		onClose?: () => void
	): void {
		const menu = new Menu().setNoIcon();
		setupMenu(menu, [
			parent(t("Copy"), [
				normal(t("Heading"), async () => {
					await navigator.clipboard.writeText(nodeInfo.raw);
				}),
				normal(t("Heading and siblings headings"), async () => {
					const { no } = nodeInfo;
					const headers = this.plugin.stringifyHeaders()
						.map((s) => s.slice(store.headers[no].level - 1))
					const siblingSet = getSiblings(no, store.headers);
					const siblings = headers.filter((_, i) => siblingSet.has(i))
					
					await navigator.clipboard.writeText(siblings.join("\n"));
					
				}),
				normal(t("Heading and children headings"), async () => {
					const { no, level } = nodeInfo;
					
					let headers = this.plugin.stringifyHeaders();
					headers = headers.map((s, i) => s.slice(store.headers[no].level - 1))
					
					let slice: string[] = [headers[no]];
					for (let i = no + 1; i < store.headers.length; i++) {
						if(store.headers[i].level <= level) {
							break;
						}
						slice.push(headers[i]);
					}
					
					await navigator.clipboard.writeText(slice.join("\n"));
				}),
				normal(t("Heading and Content"), async () => {
					store.headers[0].position.start.line
					const { no, level } = nodeInfo;
					let i = no + 1
					for (; i < store.headers.length; i++) {
						if(store.headers[i].level <= level) {
							break;
						}
					}
					
					const text = this.view.data.slice(
						store.headers[no].position.start.offset,
						store.headers[i]?.position.start.offset || this.view.data.length
					);
					await navigator.clipboard.writeText(text);
				}),
			]),
		]);
		
		menu.onHide(onClose || (() => { }));
		menu.showAtMouseEvent(event);
	}
}

function handleCursorChange(e?: CustomEvent) {
	if(!plugin.allow_cursor_change || plugin.jumping || e?.detail.docChanged) {
		return
	}

    if (plugin.settings.locate_by_cursor) {
		// fix conflict with cursor-change and scroll both triggering highlight heading change
		plugin.block_scroll()

		const current = currentLine(false, true);
		const index = nearestHeading(current);
		if (index === undefined) return;

        store.onPosChange(index);
    }
}

function currentLine(fromScroll: boolean, isSourcemode: boolean) {
    // const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    const view = (plugin.navigator as MarkDownNav).view;
    // if (!view || (plugin.current_view_type !== "markdown" /*&& plugin.current_view_type !== "embed-markdown-file"*/)) {
    //     return;
    // }

	const markdownView = view as MarkdownView;
    if (plugin.settings.locate_by_cursor && !fromScroll) {
		return isSourcemode
			? markdownView.editor.getCursor("from").line
			: Math.ceil(markdownView.previewMode.getScroll());
        // return markdownView.editor.getCursor("from").line;
    } else {
		return isSourcemode
		// @ts-ignore
		? getCurrentLineFromEditor(markdownView.editor.cm)
		: getCurrentLineFromPreview(markdownView);	
    }
}

// line above and nearest to middle of the editor
function getCurrentLineFromEditor(editorView: EditorView): number {
	const { y, height } = editorView.dom.getBoundingClientRect()
	const middle = y + height / 2
	const lineBlocks = editorView.viewportLineBlocks;

	let line: number = 0;
	lineBlocks.forEach(lb => {
		const node = editorView.domAtPos(lb.from).node;
		const el = (node.nodeName == "#text" ? node.parentNode : node) as HTMLElement;
		const elRect = el.getBoundingClientRect()
		const base = elRect.y + elRect.height / 2

		if(base <= middle) {
			line = editorView.state.doc.lineAt(lb.from).number
		}
	})
	
	return Math.max(line - 2, 0)
}

function getCurrentLineFromPreview(view: MarkdownView): number {
	const renderer = view.previewMode.renderer;
	const previewEl = (renderer as any).previewEl as HTMLElement;
	const rect = previewEl.getBoundingClientRect()
	const middle = rect.y + rect.height / 2

	const elsInViewport = previewEl.querySelectorAll(".markdown-preview-sizer>div[class|=el]")
	
	let line: number = 0;
	elsInViewport.forEach(el => {
		const { y } = el.getBoundingClientRect()
		if(y <= middle) {
			line = ((renderer as any).getSectionForElement(el) as MarkdownPreviewSection).lineStart
		}
	})
	
	return line
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

const handleScroll = debounce(_handleScroll, 200, true);

function _handleScroll(evt: Event) {
	if(!plugin.allow_scroll) {
		return
	}

	if(plugin.jumping) {
		plugin.jumping = false
		return
	}

    const target = evt.target as HTMLElement;
    if (!target.classList.contains("markdown-preview-view") && 
        !target.classList.contains("cm-scroller") &&
        // fix conflict with outliner
        // https://github.com/guopenghui/obsidian-quiet-outline/issues/133
        !target.classList.contains("outliner-plugin-list-lines-scroller")) {
        return;
    }
	
	const isSourcemode = (plugin.navigator as MarkDownNav).view.getMode() === "source";
    
    // if (plugin.jumping) {
	// 	if (isSourcemode) {
	// 		onPosChange(false, isSourcemode);
	// 		return
	// 	}
	// } 
    
    // if (plugin.settings.locate_by_cursor) {
    //     return;
    // }

	const current = currentLine(true, isSourcemode);
	const index = nearestHeading(current);
	if (index === undefined) return;

	store.onPosChange(index);
    
}
