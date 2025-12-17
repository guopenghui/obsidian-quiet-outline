import {
    Canvas,
    CanvasView,
    CanvasComponent,
    CanvasNode,
    CanvasFileNode,
    CanvasTextNode,
    Constructor,
    HeadingCache,
    EmbedMarkdownView,
    request,
    BBox,
} from "obsidian";
import { AllCanvasNodeData } from "obsidian/canvas";
import { around } from "monkey-around";
import type { QuietOutline } from "@/plugin";
import { store, Heading, SupportedIcon } from "@/store";
import { Nav } from "./base";

export class CanvasNav extends Nav {
    declare view: CanvasView;
    constructor(plugin: QuietOutline, view: CanvasView) {
        super(plugin, view);
    }
    async onload(): Promise<void> {
        if (this.plugin.settings.vimlize_canvas) {
            enableVim(this.view);
        }
    }
    async install(): Promise<void> {
        const plugin = this.plugin;
        if (!plugin.klasses["canvas"]) {
            this.patchCanvas((this.view as CanvasView).canvas);
            plugin.klasses["canvas"] = this.view
                .constructor as Constructor<any>;
        }

        // @ts-ignore
        plugin.registerEvent(
            plugin.app.workspace.on("quiet-outline:canvas-change", () => {
                plugin.refresh();
            }),
        );

        // @ts-ignore
        plugin.registerEvent(
            plugin.app.workspace.on(
                "quiet-outline:canvas-selection-change",
                async (selection: Set<CanvasComponent>) => {
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

                    // @ts-ignore
                    if (node.filePath?.endsWith(".md")) {
                        const view = (node as CanvasFileNode)
                            .child as EmbedMarkdownView;
                        await plugin.updateNav("embed-markdown-file", view);
                        await plugin.refresh_outline();
                        store.refreshTree();
                        return;
                    }

                    // @ts-ignore
                    if (node.unknownData.type === "text" || node.text) {
                        const view = (node as CanvasTextNode).child;
                        await plugin.updateNav("embed-markdown-text", view);
                        await plugin.refresh_outline();
                        store.refreshTree();
                        return;
                    }

                    await plugin.updateNav("dummy", null as any);
                    await plugin.refresh_outline();
                    store.refreshTree();
                },
            ),
        );
    }

    async jump(key: number): Promise<void> {
        // @ts-ignore
        const nodes: Map<string, AllCanvasNodeData> = this.view.canvas.nodes;
        const node = nodes.get(store.headers[key].id!);
        if (node !== undefined) {
            let node_ = node as unknown as CanvasNode;
            this.view.canvas.zoomToBbox(node_.bbox);
            this.view.canvas.selectOnly(node_);
            this.view.setEphemeralState({ focus: true });
        }
    }

    async jumpWithoutFocus(key: number) {
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
        let nodes = this.view.canvas.data.nodes as AllCanvasNodeData[];
        // nodes may be undefined when switch to canvas view
        if (nodes) {
            nodes = nodes.filter(node => this.plugin.settings.shown_node_types.includes(node.type));
            return canvasNodesToHeaders(
                nodes,
                this.plugin.settings.canvas_sort_by,
                this.plugin.settings.heading_truncate_length
            );
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
                requestSave(next) {
                    return function (...args: any[]) {
                        plugin.app.workspace.trigger(
                            "quiet-outline:canvas-change",
                        );
                        return next.apply(this, args);
                    };
                },
                updateSelection(next) {
                    return function (...args: any[]) {
                        next.apply(this, args);
                        plugin.app.workspace.trigger(
                            "quiet-outline:canvas-selection-change",
                            this.selection,
                        );
                        return;
                    };
                },
            }),
        );
    }
}

function canvasNodesToHeaders(
    nodes: AllCanvasNodeData[],
    sortMode: "area" | "name_asc" | "name_desc" = "area",
    lengthLimit: number = 20
): Heading[] {
    // 下行为原注释
    // const groups = nodes.filter(node => node.type === "group").sort((a, b) => - cmpArea(a, b));
    const nodesDec = nodes.slice().sort((a, b) => {
        if (sortMode === "name_asc") {
            return text(a).localeCompare(text(b), undefined, { numeric: true });
        }
        if (sortMode === "name_desc") {
            return text(b).localeCompare(text(a), undefined, { numeric: true });
        }
        // 默认按面积倒序
        return -cmpArea(a, b);
    });

    const trees: TreeNode[] = [];
    for (let i = 0; i < nodesDec.length; i++) {
        nodesDec[i].type
        insert(trees, nodesDec[i]);
    }

    const heads: Heading[] = [];
    traverse(trees, 1, (node, level) => {
        heads.push({
            level,
            heading: text(node, lengthLimit),
            id: node.id,
            icon: chooseIcon(node),
            position: {
                start: { line: 0, col: 0, offset: 0 },
                end: { line: 0, col: 0, offset: 0 },
            },
        });
    });
    return heads;
}

function chooseIcon(node: AllCanvasNodeData): SupportedIcon {
    if (node.type === "group") {
        return "create-group";
    }
    if (node.type === "text") {
        return "lucide-sticky-note";
    }
    if (node.type === "link") {
        return "lucide-globe-2";
    }
    if (node.type === "file") {
        if (node.file.endsWith(".md")) {
            return "lucide-file-text";
        }
        if (node.file.endsWith(".mp3")) {
            return "lucide-music-2";
        }
        if (node.file.endsWith(".mp4")) {
            return "lucide-youtube";
        }
        if (node.file.endsWith(".png") || node.file.endsWith(".jpg")) {
            return "lucide-file-image";
        }
    }
    return "lucide-link";
}

const area = (node: AllCanvasNodeData) => node.height * node.width;
function cmpArea(a: AllCanvasNodeData, b: AllCanvasNodeData) {
    return area(a) - area(b);
}

const cacheTitle: Record<string, string> = {};
function text(node: AllCanvasNodeData, lengthLimit: number = 20): string {
    let text: string;
    switch (node.type) {
        case "text": {
            text = node.text.split("\n")[0];
            text = text.slice(text.search(/[^#\s].*/));
            if (text.length > lengthLimit) {
                text = text.substring(0, lengthLimit) + "...";
            }
            break;
        }
        case "file": {
            text = node.file.split("/").slice(-1)[0];
            break;
        }
        case "link": {
            if (cacheTitle[node.url]) {
                text = cacheTitle[node.url];
            } else {
                text = node.url;
                request(node.url)
                    .then((res) => {
                        cacheTitle[node.url] =
                            /<title>(.*)<\/title>/.exec(res)?.[1] || "";
                    })
                    .catch(() => { });
            }
            break;
        }
        case "group": {
            text = node.label || "Unnamed Group";
            break;
        }
    }
    return text;
}

type TreeNode = { node: AllCanvasNodeData; children: TreeNode[]; };
function traverse(
    trees: TreeNode[],
    level: number,
    callback: (node: AllCanvasNodeData, level: number) => void,
) {
    for (let i = 0; i < trees.length; i++) {
        callback(trees[i].node, level);
        traverse(trees[i].children, level + 1, callback);
    }
}
function insert(trees: TreeNode[], node: AllCanvasNodeData) {
    let insertToChildren = false;

    for (let i = 0; i < trees.length; i++) {
        if (trees[i].node.type === "group" && isInside(node, trees[i].node)) {
            insertToChildren = true;
            insert(trees[i].children, node);
        }
    }
    if (!insertToChildren) {
        trees.push({
            node,
            children: [],
        });
    }
}

type Node = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/**
 * a inside b
 **/
function isInside(a: Node, b: Node): boolean {
    return (
        a.x >= b.x &&
        a.y >= b.y &&
        a.x + a.width <= b.x + b.width &&
        a.y + a.height <= b.y + b.height
    );
}

function enableVim(view: CanvasView) {
    // @ts-ignore
    if (view.__vimed) return;

    view.scope?.register([], "Escape", (e) => {
        check(e) || (e.preventDefault(), view.canvas.deselectAll());
    });

    view.scope?.register([], "J", (e) => {
        check(e) || (e.preventDefault(), move(view.canvas, "down"));
    });
    view.scope?.register([], "K", (e) => {
        check(e) || (e.preventDefault(), move(view.canvas, "up"));
    });
    view.scope?.register([], "H", (e) => {
        check(e) || (e.preventDefault(), move(view.canvas, "left"));
    });
    view.scope?.register([], "L", (e) => {
        check(e) || (e.preventDefault(), move(view.canvas, "right"));
    });

    view.scope?.register([], "I", (e) => {
        if (check(e)) return;
        const node = onlyOneNodeSelected(view.canvas);
        if (!node) return;

        e.preventDefault();
        node.startEditing();
    });

    let pending: string | null = null;
    view.scope?.register([], "Z", (e) => {
        if (check(e)) return;

        e.preventDefault();
        if (pending === "Z") {
            const node = onlyOneNodeSelected(view.canvas);
            if (!node) return;

            pending = null;
            view.canvas.zoomToBbox(node.bbox);
            return;
        }

        pending = "Z";
        setTimeout(() => {
            pending = null;
        }, 300);
    });
    view.scope?.register([], "A", (e) => {
        if (check(e)) return;
        // const node = onlyOneNodeSelected(view.canvas);
        // if (!node) return;

        e.preventDefault();
        if (pending === "Z") {
            pending = null;
            view.canvas.zoomToFit();
            return;
        }
    });


    // @ts-ignore
    view.__vimed = true;
}

// copied from app.js
function check(e: KeyboardEvent) {
    const t = e.targetNode;
    return t?.instanceOf(HTMLElement) && "true" === t.contentEditable;
}

function onlyOneNodeSelected(canvas: Canvas): CanvasNode | null {
    const selection = [...canvas.selection];
    if (selection.length !== 1 || canvas.edges.has(selection[0].id)) return null;
    return selection[0] as CanvasNode;
}

// move to another node
function move(canvas: Canvas, dir: "up" | "down" | "left" | "right") {
    if (canvas.selection.size > 1) return;
    if (canvas.selection.size === 0) {
        const nodes = canvas.getContainingNodes(canvas.getViewportBBox());
        if (nodes.length > 0) {
            canvas.selectOnly(nodes[0]);
        }
        return;
    }

    const selected = [...canvas.selection.values()][0];
    if (canvas.edges.has(selected.id)) return;

    const node = selected as CanvasNode;
    const box = node.bbox;

    let nodes = [...canvas.nodes.values()]
        .filter(n => n !== node && n.unknownData.type !== "group");

    switch (dir) {
        case "up": {
            const set1 = nodes.filter(n => n.bbox.maxY < box.minY);
            const set2 = set1.filter(n => intersect(n.bbox, box, "x"));
            nodes = set2.length > 0
                ? set2.sort((a, b) => b.bbox.maxY - a.bbox.maxY)
                : set1.sort((a, b) => dist(a.bbox, box) - dist(b.bbox, box));
            break;
        }
        case "down": {
            const set1 = nodes.filter(n => n.bbox.minY > box.maxY);
            const set2 = set1.filter(n => intersect(n.bbox, box, "x"));
            nodes = set2.length > 0
                ? set2.sort((a, b) => a.bbox.minY - b.bbox.minY)
                : set1.sort((a, b) => dist(a.bbox, box) - dist(b.bbox, box));
            break;
        }
        case "left": {
            const set1 = nodes.filter(n => n.bbox.maxX < box.minX);
            const set2 = set1.filter(n => intersect(n.bbox, box, "y"));
            nodes = set2.length > 0
                ? set2.sort((a, b) => b.bbox.maxX - a.bbox.maxX)
                : set1.sort((a, b) => dist(a.bbox, box) - dist(b.bbox, box));
            break;
        }
        case "right": {
            const set1 = nodes.filter(n => n.bbox.minX > box.maxX);
            const set2 = set1.filter(n => intersect(n.bbox, box, "y"));
            nodes = set2.length > 0
                ? set2.sort((a, b) => a.bbox.minX - b.bbox.minX)
                : set1.sort((a, b) => dist(a.bbox, box) - dist(b.bbox, box));
            break;
        }
    }

    const target = nodes[0];
    if (!target) return;

    canvas.selectOnly(target);
    canvas.panIntoView(target.bbox);
}

function intersect(a: BBox, b: BBox, dimension: "x" | "y") {
    return dimension === "x" ?
        a.minX < b.maxX && a.maxX > b.minX :
        a.minY < b.maxY && a.maxY > b.minY;
}

function dist(a: BBox, b: BBox) {
    const centerA = { x: a.minX + (a.maxX - a.minX) / 2, y: a.minY + (a.maxY - a.minY) / 2 };
    const centerB = { x: b.minX + (b.maxX - b.minX) / 2, y: b.minY + (b.maxY - b.minY) / 2 };
    return Math.sqrt(Math.pow(centerA.x - centerB.x, 2) + Math.pow(centerA.y - centerB.y, 2));
}
