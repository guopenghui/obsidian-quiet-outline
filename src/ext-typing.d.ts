import {
    AllCanvasNodeData,
    CanvasColor,
    CanvasEdgeData,
    EdgeEnd,
    NodeSide,
} from "obsidian/canvas";

declare module "obsidian" {
    interface Workspace {
        getActiveFileView: () => FileView;
        on(name: "quiet-outline:canvas-change", callback: () => void): EventRef;
        on(name: "quiet-outline:active-fileview-change", callback: (view: FileView | null) => void): EventRef;
        on(name: "quiet-outline:canvas-selection-change", callback: (selection: Set<CanvasComponent>) => Promise<void>): EventRef;
    }

    interface MarkdownPreviewSection {
        el: HTMLElement;
        height: number;
        html: string;
        lineStart: number;
        lineEnd: number;
        lines: number;
    }

    interface MarkdownPreviewRenderer {
        sections: MarkdownPreviewSection[];
        viewportHeight: number;

        applyScroll(
            scroll: number,
            config: { highlight: boolean; center: boolean },
        ): boolean;

        highlightEl(el: HTMLElement): void;

        /**
         * calculate top position of a section by sum height of all previous section
         */
        getSectionTop(section: MarkdownPreviewSection): number;
    }

    interface MarkdownPreviewView {
        renderer: MarkdownPreviewRenderer;
    }

    export interface CanvasView extends FileView {
        app: App;
        canvas: Canvas;
        data: string;
        file: TFile;

        /**
         * execute when the canvas is modified
         */
        requestSave(): void;
    }

    type CanvasComponent = CanvasNode | CanvasEdge;

    export interface Canvas {
        nodes: Map<string, CanvasNode>;
        edges: Map<string, CanvasEdge>;
        data: {
            nodes: AllCanvasNodeData[];
            edges: CanvasEdgeData[];
        };
        /** edges set from node */
        edgeFrom: { data: Map<CanvasNode, Set<CanvasEdge>> };
        /** edges set to node */
        edgeTo: { data: Map<CanvasNode, Set<CanvasEdge>> };

        selection: Set<CanvasComponent>;

        /**
         * execute when the canvas is modified
         */
        requestSave(isPushHistory: boolean): void;

        select(component: CanvasComponent): void;
        deselect(component: CanvasComponent): void;

        /**
         * clear selection and add all components provided to selection
         *
         * if no component provided, add all nodes to selection (no edges)
         */
        selectAll(components?: CanvasComponent[]): void;
        deselectAll(): void;
        selectOnly(component: CanvasNode | CanvasEdge): void;

        zoomToBbox(bbox: BBox): void;
        zoomToFit(): void;
        zoomToSelection(): void;

        panIntoView(bbox: BBox): void;
        updateSelection(update: () => void): void;
        getContainingNodes(bbox: BBox): CanvasNode[];
        getViewportBBox(): BBox;
    }

    export interface CanvasNodeInstance {
        id: string;
        bbox: BBox;
        color: CanvasColor;
        canvas: Canvas;
        containerEl: HTMLElement;
        contentEl: HTMLElement;
        labelEl: HTMLElement;
        nodeEl: HTMLElement;
        height: number;
        width: number;
        x: number;
        y: number;
        renderedZIndex: number;

        select(): void;
        deselect(): void;
        getData(): AllCanvasNodeData;
        startEditing(): void;
    }

    interface CanvasGroupNode extends CanvasNodeInstance {
        label: string;
        unknownData: {
            type: "group";
        };

        setLabel(label: string): void;
    }

    type NodeFileType = EmbedMarkdownView | any;

    interface CanvasFileNode extends CanvasNodeInstance {
        file: TFile;
        filePath: string;
        child: NodeFileType;
        unknownData: {
            file: string;
            type: "file";
        };
    }

    interface CanvasTextNode extends CanvasNodeInstance {
        unknownData: {
            text: string;
            type: "text";
        };
        child: EmbedMarkdownView;
    }

    interface CanvasLinkNode extends CanvasNodeInstance {
        unknownData: {
            url: string;
            type: "link";
        };

        setUrl(url: string): void;
    }

    export type CanvasNode =
        | CanvasGroupNode
        | CanvasFileNode
        | CanvasTextNode
        | CanvasLinkNode;

    export interface BBox {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    }

    export interface CanvasEdgeExt {
        id: string;
        bbox: BBox;
        color: CanvasColor;
        label?: string;
        from: {
            node: CanvasNode;
            side: NodeSide;
            end: EdgeEnd;
        };
        to: {
            node: CanvasNode;
            side: NodeSide;
            end: EdgeEnd;
        };

        select(): void;
        deselect(): void;
        getData(): CanvasEdgeData;
    }

    export type CanvasEdge = CanvasEdgeExt;

    interface FileView {
        data: string;
    }

    export interface EmbedMarkdownView extends View {
        data: string;
        text: string;
        file: TFile;
        editMode: {
            editor: Editor;
        };
        previewMode: {
            containerEl: HTMLElement;
            renderer: MarkdownPreviewRenderer;
        };

        getMode(): "preview" | "source";
        toggleMode(): void;
    }

    interface Editor {
        /**
         * @param ranges
         * @param highlightClass set to "is-flashing"
         * @param flag1 function unknown, set to true
         * @param flag2 function unknown, set to true
         */
        addHighlights(
            ranges: EditorRange[],
            highlightClass: string,
            flag1: boolean,
            flag2: boolean,
        ): void;
    }

    interface MenuItem {
        setSubmenu(): Menu;
    }
}

export {};
