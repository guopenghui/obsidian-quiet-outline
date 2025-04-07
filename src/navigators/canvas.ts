import {
	Canvas, CanvasView, 
	CanvasComponent,
	CanvasNode,
	CanvasFileNode,
	CanvasTextNode,
	Constructor, HeadingCache,
	EmbedMarkdownView,
	request,
} from "obsidian";
import { AllCanvasNodeData } from "obsidian/canvas";
import { around } from "monkey-around"
import type {QuietOutline} from "@/plugin";
import { store, Heading, SupportedIcon } from '@/store';
import {Nav} from "./base";

export class CanvasNav extends Nav {
	view: CanvasView;
	constructor(plugin: QuietOutline, view: CanvasView){
		super(plugin);
		this.view = view;
	}
	async onload(): Promise<void> {
	}
	async install(): Promise<void> {
		const plugin = this.plugin;
		if (!plugin.klasses["canvas"]) {
			this.patchCanvas((this.view as CanvasView).canvas);
			plugin.klasses["canvas"] = this.view.constructor as Constructor<any>;
		}

		// @ts-ignore
		plugin.registerEvent(plugin.app.workspace.on('quiet-outline:canvas-change', () => {
			plugin.refresh();
		}))

		// @ts-ignore
		plugin.registerEvent(plugin.app.workspace.on('quiet-outline:canvas-selection-change', async (selection: Set<CanvasComponent>) => {
			// if selection change to 0 or more than 1, return to canvas view
			if (selection.size === 0 || selection.size > 1) {
				const view = plugin.app.workspace.getActiveFileView();
				if (!view) return;
				await plugin.updateNav(view.getViewType(), view);
				await plugin.refresh_outline();
				store.refreshTree();
				return;
			}

			// if selection is only 1 textNode or md fileNode, show md outline
			const component = [...selection][0];
			if (!component.hasOwnProperty("nodeEl")) return;

			const node = component as CanvasNode;
			
			if (node.unknownData.type === "file" && (node as CanvasFileNode).file.extension === "md") {
				const view = (node as CanvasFileNode).child as EmbedMarkdownView;
				await plugin.updateNav("embed-markdown-file", view);
				await plugin.refresh_outline();
				store.refreshTree();
				return;
			}

			if (node.unknownData.type === "text" ) {
				const view = (node as CanvasTextNode).child;
				await plugin.updateNav("embed-markdown-text", view);
				await plugin.refresh_outline();
				store.refreshTree();
				return;
			}
		}))
	}

	async jump(key: number): Promise<void> {
		// @ts-ignore
		const nodes: Map<string, AllCanvasNodeData> = this.view.canvas.nodes;
		const node = nodes.get(store.headers[key].id!);
		if (node !== undefined) {
			this.view.canvas.zoomToBbox(node.bbox);	
		}
		
	} 
	async setHeaders(): Promise<void> {
		store.headers = await this.getHeaders();
	} 
	async getHeaders(): Promise<HeadingCache[]> {
		const nodes = this.view.canvas.data.nodes as AllCanvasNodeData[];
		// nodes may be undefined when switch to canvas view
		if (nodes) {
			return canvasNodesToHeaders(nodes);
		}
		return [];
	} 
	async updateHeaders(): Promise<void> {
		await this.setHeaders();
	}
	
	getPath(): string {
		return this.view.file.path;
	}
	
	getId(): string {
		return "canvas";
	}

	patchCanvas(canvas: Canvas) {
		const plugin = this.plugin;
		plugin.register(
			around(canvas.constructor.prototype as Canvas, {
				requestSave (next) {
					return function(...args: any[]) {
						plugin.app.workspace.trigger("quiet-outline:canvas-change");
						return next.apply(this, args);	
					}
				},
				updateSelection(next) {
					return function(...args: any[]) {
						next.apply(this, args);
						plugin.app.workspace.trigger("quiet-outline:canvas-selection-change", this.selection);
						return;	
					}
				},	
			})
		)
	}
}


function canvasNodesToHeaders(nodes: AllCanvasNodeData[]): Heading[] {
	// const groups = nodes.filter(node => node.type === "group").sort((a, b) => - cmpArea(a, b));
	const nodesDec = nodes.slice().sort((a, b) => - cmpArea(a, b));

	const trees: TreeNode[] = [];
	for(let i = 0; i < nodesDec.length; i++) {
		insert(trees, nodesDec[i]);
	}

	const heads: Heading[] = []
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
						cacheTitle[node.url] = /<title>(.*)<\/title>/.exec(res)?.[1] || "";
					})
					.catch(() => {});
			}
			break;
		}
		case 'group': {
			text = node.label || "Unnamed Group";
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
