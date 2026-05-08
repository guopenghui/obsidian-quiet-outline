import type QuietOutline from "@/plugin";
import { store, type Heading } from "@/store";
import { Nav } from "./base";

// ---- LineageView dynamic types (no import from lineage plugin) ----

type LineageViewLike = {
    isActive: boolean;
    file: { path: string } | null;
    documentStore: {
        getValue(): {
            sections: {
                id_section: Record<string, string>;
                section_id: Record<string, string>;
            };
            document: {
                content: Record<string, { content: string }>;
            };
        };
    };
    viewStore: {
        dispatch(action: { type: string; payload: { id: string } }): void;
    };
    container: HTMLElement | null;
    leaf: {
        setViewState(...args: unknown[]): void;
    };
};

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Helpers ----

function sortSectionNumbers(a: string, b: string): number {
    const partsA = a.split(".").map(Number);
    const partsB = b.split(".").map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

function extractHeadingLines(content: string): string[] {
    const lines = content.split("\n");
    const headings: string[] = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#")) {
            const text = trimmed.replace(/^#+\s*/, "").trim();
            if (text) headings.push(text);
        }
    }
    return headings;
}

function sectionLevel(section: string): number {
    return section.split(".").length;
}

// ---- Navigator ----

export class LineageNav extends Nav {
    canDrop: boolean = false;

    constructor(plugin: QuietOutline, view: unknown) {
        super(plugin, view as any);
    }

    getId(): string {
        return "lineage";
    }

    getPath(): string {
        const lineageView = this.findActiveLineageView();
        return lineageView?.file?.path ?? "";
    }

    findActiveLineageView(): LineageViewLike | null {
        const leaves = this.plugin.app.workspace.getLeavesOfType("lineage");
        // Prefer the active view first
        for (const leaf of leaves) {
            const view = leaf.view as unknown as LineageViewLike | undefined;
            if (view && view.isActive) {
                return view;
            }
        }
        // Fall back to any lineage view that has a file loaded
        for (const leaf of leaves) {
            const view = leaf.view as unknown as LineageViewLike | undefined;
            if (view && view.file) {
                return view;
            }
        }
        return null;
    }

    async getHeaders(): Promise<Heading[]> {
        const lineageView = this.findActiveLineageView();
        if (!lineageView) return [];

        const docState = lineageView.documentStore.getValue();
        const { section_id } = docState.sections;
        const content = docState.document.content;

        // Get all section numbers sorted in document order
        const sections = Object.keys(section_id).sort(sortSectionNumbers);

        const headings: Heading[] = [];
        for (const section of sections) {
            const nodeId = section_id[section];
            const nodeContent = content[nodeId]?.content ?? "";
            const headingLines = extractHeadingLines(nodeContent);

            // Skip cards with no heading lines
            if (headingLines.length === 0) continue;

            // Each heading line in the card gets its own outline entry
            for (const headingText of headingLines) {
                headings.push({
                    heading: headingText,
                    level: sectionLevel(section),
                    position: {
                        start: { line: 0, col: 0, offset: 0 },
                        end: { line: 0, col: 0, offset: 0 },
                    },
                    // Store nodeId for jump navigation
                    id: nodeId,
                });
            }
        }

        return headings;
    }

    async setHeaders(): Promise<void> {
        store.headers = await this.getHeaders();
    }

    async updateHeaders(): Promise<void> {
        await this.setHeaders();
    }

    async jump(key: number): Promise<void> {
        const heading = store.headers[key];
        if (!heading || !heading.id) return;

        const lineageView = this.findActiveLineageView();
        if (!lineageView) return;

        const nodeId = heading.id;

        this.plugin.startJumping();
        this.plugin.outlineView?.vueInstance.onPosChange(key);

        // Wait for render frame before dispatching (matches lineage's selectCard)
        await delay(16);

        // Activate the card
        lineageView.viewStore.dispatch({
            type: "view/set-active-node/mouse",
            payload: { id: nodeId },
        });

        // Set the lineage leaf as active with focus
        this.plugin.app.workspace.setActiveLeaf(
            lineageView.leaf as any,
            { focus: true },
        );

        // Wait for card to render with stable layout, then scroll
        await this._scrollToCard(lineageView, nodeId);
    }

    async jumpWithoutFocus(key: number): Promise<void> {
        const heading = store.headers[key];
        if (!heading || !heading.id) return;

        const lineageView = this.findActiveLineageView();
        if (!lineageView) return;

        const nodeId = heading.id;

        this.plugin.startJumping();
        this.plugin.outlineView?.vueInstance.onPosChange(key);

        await delay(16);

        lineageView.viewStore.dispatch({
            type: "view/set-active-node/mouse",
            payload: { id: nodeId },
        });

        await this._scrollToCard(lineageView, nodeId);
    }

    async _scrollToCard(lineageView: LineageViewLike, nodeId: string) {
        const startTime = Date.now();
        while (Date.now() - startTime < 3000) {
            const container = lineageView.container;
            if (!container) {
                await delay(50);
                continue;
            }
            const cardEl = container.querySelector(`#${CSS.escape(nodeId)}`);
            if (!cardEl) {
                await delay(50);
                continue;
            }
            const rect = cardEl.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
            }
            await delay(50);
        }
    }

    getDefaultLevel(): number {
        return parseInt(this.plugin.settings.expand_level);
    }

    async onload(): Promise<void> {
        // No special listeners needed — the plugin's metadata cache
        // listener will trigger refresh when the file changes
    }

    async onunload(): Promise<void> {
        // Nothing to clean up
    }
}