import {
	Constructor,
	debounce,
	FileView,
	MarkdownView,
	Notice,
	Plugin,
	HeadingCache,
	CanvasView,
	Canvas,
	CanvasComponent,
	CanvasNode,
	CanvasFileNode,
	CanvasTextNode,
	EmbedMarkdownView,
	Editor,
	MarkdownPreviewRenderer,
	request,
} from 'obsidian';
import { AllCanvasNodeData } from "obsidian/canvas";

import { OutlineView, VIEW_TYPE } from './view';
import { store, Heading, SupportedIcon } from './store';
import { parseMetaDataCache } from "./utils"

import { SettingTab, QuietOutlineSettings, DEFAULT_SETTINGS } from "./settings";
import { editorEvent } from "./editorExt"
import { around } from "monkey-around"

type LegalViewType = EmbedMarkdownView | FileView
type LegalViewName = "markdown" | "kanban" | "canvas" | "embed-markdown-file" | "embed-markdown-text";

export class QuietOutline extends Plugin {
	settings: QuietOutlineSettings;
	current_note: LegalViewType;
	current_view_type: string;
	current_file: string;
	jumping: boolean;
	heading_states: Record<string, string[]> = {};
	klasses: Record<string, Constructor<any>> = {};

	async onload() {
		await this.loadSettings();

		// TEST: 测试插件功能
		// this.addRibbonIcon('bot', 'test something', (evt) => {
		// 	const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		// 	console.dir(view.getState())
		// })

		this.initStore();

		this.registerView(
			VIEW_TYPE,
			(leaf) => new OutlineView(leaf, this)
		);
		
		this.registerListener();

		this.registerCommand();

		this.addSettingTab(new SettingTab(this.app, this));
		
		this.registerExt();
		
		this.activateView();
	}

	initStore() {
		store.headers = [];
		store.dark = document.body.hasClass("theme-dark");
		store.markdown = this.settings.markdown;
		store.ellipsis = this.settings.ellipsis;
		store.labelDirection = this.settings.label_direction;
		store.leafChange = false;
		store.searchSupport = this.settings.search_support;
		store.levelSwitch = this.settings.level_switch;
		store.hideUnsearched = this.settings.hide_unsearched;
		store.regexSearch = this.settings.regex_search;
		store.autoExpand = this.settings.auto_expand;
		store.dragModify = this.settings.drag_modify;
		store.patchColor = this.settings.patch_color;
		store.primaryColorLight = this.settings.primary_color_light;
		store.primaryColorDark = this.settings.primary_color_dark;
		store.rainbowLine = this.settings.rainbow_line;
		store.rainbowColor1 = this.settings.rainbow_color_1;
		store.rainbowColor2 = this.settings.rainbow_color_2;
		store.rainbowColor3 = this.settings.rainbow_color_3;
		store.rainbowColor4 = this.settings.rainbow_color_4;
		store.rainbowColor5 = this.settings.rainbow_color_5;
	}
	
	patchCanvas(canvas: Canvas) {
		const that = this;
		this.register(
			around(canvas.constructor.prototype as Canvas, {
				requestSave (next) {
					return function(...args: any[]) {
						that.app.workspace.trigger("quiet-outline:canvas-change");
						return next.apply(this, args);	
					}
				},
				updateSelection(next) {
					return function(...args: any[]) {
						next.apply(this, args);
						that.app.workspace.trigger("quiet-outline:canvas-selection-change", this.selection);
						return;	
					}
				},	
			})
		)
	}

	registerListener() {
		this.registerEvent(this.app.workspace.on("css-change", () => {
			store.dark = document.body.hasClass("theme-dark");
			store.cssChange = !store.cssChange;
		}));
		
		// remove states from closed notes
		this.registerEvent(this.app.workspace.on("layout-change", () => {
			const leaves = this.app.workspace.getLeavesOfType("markdown");
			let filteredStates: Record<string, string[]> = {};
			leaves.forEach((leaf) => {
				const path = (leaf.view as MarkdownView).file.path;
				this.heading_states[path] && 
					(filteredStates[path] = this.heading_states[path]);
			})

			this.heading_states = filteredStates;
		}));
		

		const refresh = debounce(this.refresh_outline, 300, true);
		this.registerEvent(this.app.metadataCache.on('changed', () => {
			refresh();
		}));
		
		// @ts-ignore
		this.registerEvent(this.app.workspace.on('quiet-outline:canvas-change', () => {
			refresh();
		}))

		// @ts-ignore
		this.registerEvent(this.app.workspace.on('quiet-outline:canvas-selection-change', (selection: Set<CanvasComponent>) => {
			// if selection change to 0 or more than 1, return to canvas view
			if (selection.size === 0 || selection.size > 1) {
				let view = this.app.workspace.getActiveFileView();
				if (!view) return;
				this.changeCurrentView(view, view.getViewType());
				return;
			}

			// if selection is only 1 textNode or md fileNode, show md outline
			let component = [...selection][0];
			if (!component.hasOwnProperty("nodeEl")) return;

			let node = component as CanvasNode;
			
			if (node.unknownData.type === "file" && (node as CanvasFileNode).file.extension === "md") {
				let view = (node as CanvasFileNode).child as EmbedMarkdownView;
				this.changeCurrentView(view, "embed-markdown-file");
				return;
			}

			if (node.unknownData.type === "text" ) {
				let view = (node as CanvasTextNode).child;
				this.changeCurrentView(view, "embed-markdown-text")
				return;
			}
		}))

		this.registerEvent(this.app.workspace.on('active-leaf-change', async (leaf) => {
			let view = this.app.workspace.getActiveFileView();
			if (!view || view !== leaf.view) {
				return;
			}

			this.changeCurrentView(view, view.getViewType());
		}));
	}
	// refresh headings
	refresh_outline = async () => {
		const view = this.current_note
		const viewType = this.current_view_type

		if (viewType === "markdown" || viewType === "kanban" || viewType === "embed-markdown-file") {
			const current_file = view.file;
			const cache = this.app.metadataCache.getFileCache(current_file);
			if (cache && cache.headings) {
				store.headers = cache.headings;
				return;
			}
		} else if (viewType === "canvas") {
			const nodes = (view as CanvasView).canvas.data.nodes as AllCanvasNodeData[];
			// nodes may be undefined when switch to canvas view
			if (nodes) {
				store.headers = canvasNodesToHeaders(nodes);
				return
			}
		} else if (viewType === "embed-markdown-text") {
			const { headings } = await parseMetaDataCache(this.app, (view as EmbedMarkdownView).text);
			
			store.headers = headings;
			return;
		}
		store.headers = [];
	};
	
	async changeCurrentView(view: LegalViewType, viewType: string) {
		switch (viewType) {
			case "markdown" :{
				store.jumpBy = markdownJump
				break;	
			}
			case "kanban" :{
				store.jumpBy = kanbanJump
				break;	
			}
			case "canvas" :{
				if (!this.klasses["canvas"]) { this.patchCanvas((view as CanvasView).canvas)
					this.klasses["canvas"] = view.constructor as Constructor<any>;
				}
				store.jumpBy = canvasJump
				break;	
			}
			case "embed-markdown-file": 
			case "embed-markdown-text" :{
				store.jumpBy = embedMarkdownJump;
				break;	
			}
			default : {
				store.jumpBy = dummyJump
				break;
			}
		}

		// @ts-ignore
		let path = view.file?.path;

		// 保证第一次获取标题信息时，也能正常展开到默认层级
		if (!this.current_note) {
			this.current_note = view;
			this.current_file = path;
			this.current_view_type = viewType;
			await this.refresh_outline();
			store.refreshTree();
			return;
		}

		const pathEq = path === this.current_file;
		if (!pathEq) {
			store.refreshTree();
		}

		this.current_note = view;
		this.current_file = path; 
		this.current_view_type = viewType;
		this.refresh_outline();
		return;
		
	}

	registerCommand() {
		this.addCommand({
			id: "quiet-outline",
			name: "Quiet Outline",
			callback: () => {
				this.activateView();
			}
		});

		this.addCommand({
			id: "quiet-outline-reset",
			name: "Reset expanding level",
			callback: () => {
				dispatchEvent(new CustomEvent("quiet-outline-reset"));
			}
		});

		this.addCommand({
			id: "quiet-outline-focus-input",
			name: "Focus on input",
			callback: () => {
				let input = document.querySelector("input.n-input__input-el") as HTMLInputElement;
				if (input) {
					input.focus();
				}
			}
		});

		this.addCommand({
			id: "quiet-outline-copy-as-text",
			name: "Copy as plain text",
			callback: async () => {
				let headers = store.headers.map((h) => {
					return "    ".repeat(h.level - 1) + h.heading;
				});
				await navigator.clipboard.writeText(headers.join("\n"));
				new Notice("Headings copied");
			}
		});

	}
	
	registerExt() {
		this.registerEditorExtension([
			editorEvent
		]);
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		// fix console error
		// https://github.com/guopenghui/obsidian-quiet-outline/issues/154
		if (this.app.workspace.rightSplit === null) return;

		if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length === 0
		) {
			await this.app.workspace.getRightLeaf(false).setViewState({
				type: VIEW_TYPE,
				active: true,
			});
		}
		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]
		);
	}

}
export function dummyJump(plugin: QuietOutline, key: number) {}

function markdownJump(plugin: QuietOutline, key: number) {
    let line: number = store.headers[key].position.start.line;

    // const view = store.plugin.app.workspace.getActiveViewOfType(MarkdownView)
    const view = plugin.current_note as MarkdownView;
    if (view) {
		const cursor = {
			from: {line, ch: 0},
			to: {line, ch: 0},
		}
		const state = {
			line,
			cursor,
		}

		plugin.jumping = true;
        view.setEphemeralState(state);
        setTimeout(() => {
			plugin.jumping = false;
			// view.setEphemeralState({cursor});
		}, 200);
    }
}

function kanbanJump(plugin: QuietOutline, key: number) {
	const panes = document.querySelectorAll(
		'.workspace-leaf[style=""] .kanban-plugin__lane-wrapper'
	);
	
	panes[key]?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
}

function canvasJump(plugin: QuietOutline, key: number) {
	let view = plugin.current_note;
	if (!(view instanceof FileView) || view.getViewType() !== "canvas") {
		throw new Error("Not in canvas view");
	}

	const nodes: Map<string, AllCanvasNodeData> = (plugin.current_note as any).canvas.nodes;
	const node = nodes.get(store.headers[key].id);
	if (node !== undefined) {
		(plugin.current_note as any).canvas.zoomToBbox(node.bbox);	
	}
}

function canvasNodesToHeaders(nodes: AllCanvasNodeData[]): Heading[] {
	// const groups = nodes.filter(node => node.type === "group").sort((a, b) => - cmpArea(a, b));
	const nodesDec = nodes.slice().sort((a, b) => - cmpArea(a, b));

	let trees: TreeNode[] = [];
	for(let i = 0; i < nodesDec.length; i++) {
		insert(trees, nodesDec[i]);
	}

	let heads: Heading[] = []
	traverse(trees, 1, (node, level) => {
		heads.push({
			level,
			heading: text(node),
			id: node.id,
			icon: chooseIcon(node),
			position: {
				start: {line: 0, col: 0, offset: 0},
				end: {line: 0, col: 0, offset: 0},
			}
		})
		
	})
	return heads
}

function chooseIcon(node: AllCanvasNodeData): SupportedIcon {
	if (node.type === "group") {
		return "CategoryOutlined";
	}
	if (node.type === "text") {
		return "TextFieldsOutlined";
	}
	if (node.type === "link") {
		return "PublicOutlined";
	}
	if (node.type === "file") {
		if (node.file.endsWith(".md")) {
			return "ArticleOutlined";
		}	
		if (node.file.endsWith(".mp3")) {
			return "AudiotrackOutlined";
		}	
		if (node.file.endsWith(".mp4")) {
			return "OndemandVideoOutlined";
		}	
		if (node.file.endsWith(".png") || node.file.endsWith(".jpg")) {
			return "ImageOutlined";
		}	
	}
	return "FilePresentOutlined";
}

const area = (node: AllCanvasNodeData) => node.height * node.width;
function cmpArea(a: AllCanvasNodeData, b: AllCanvasNodeData) {
	return area(a) - area(b);
}

const cacheTitle: Record<string, string> = {};
function text(node: AllCanvasNodeData): string {
	let text: string;
	switch(node.type) {
		case "text": {
			text = node.text.split("\n")[0];
			text = text.slice(text.search(/[^#\s].*/));
			if (text.length > 20) {
				text = text.substring(0, 20) + "...";
			}
			break;
		}
		case 'file': {
			text = node.file.split("/").slice(-1)[0];
			break;
		}
		case 'link': {
			if (cacheTitle[node.url]) {
				text = cacheTitle[node.url];
			} else {
				text = node.url;
				request(node.url)
					.then(res => {
						cacheTitle[node.url] = /<title>(.*)<\/title>/.exec(res)[1];
					})
					.catch(() => {});
			}
			break;
		}
		case 'group': {
			text = node.label;
			break;
		}
	}
	return text;
}


type TreeNode = {node:AllCanvasNodeData, children: TreeNode[]}
function traverse(trees: TreeNode[], level: number,  callback: (node: AllCanvasNodeData, level: number) => void) {
	for(let i = 0; i < trees.length; i++) {
		callback(trees[i].node, level);
		traverse(trees[i].children, level + 1, callback);
	}	
}
function insert(trees: TreeNode[], node: AllCanvasNodeData) {
	let insertToChildren = false;

	for(let i = 0; i < trees.length; i++) {
		if (trees[i].node.type === "group" && isInside(node, trees[i].node)) {
			insertToChildren = true;
			insert(trees[i].children, node);
		}
	}
	if (!insertToChildren) {
		trees.push({
			node,
			children: []
		})
	}
}

/**
 * a inside b
 **/ 
function isInside(a: AllCanvasNodeData, b: AllCanvasNodeData): boolean {
	return (
		a.x >= b.x
		&& a.y >= b.y
		&& a.x + a.width <= b.x + b.width
		&& a.y + a.height <= b.y + b.height
	);
}


function embedMarkdownJump(plugin: QuietOutline, key: number) {
	const view = plugin.current_note as EmbedMarkdownView;
	const line = store.headers[key].position.start.line;
	setEphemeralState(view, {line});
}

export function setEphemeralState(view: EmbedMarkdownView, option: {line: number}) {
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