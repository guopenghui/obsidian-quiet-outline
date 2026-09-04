import { around } from "monkey-around";
import type {
    BasesEntry,
    BasesEntryGroup,
    BasesFileView,
    BasesPropertyId,
    BasesView,
} from "obsidian";
import type QuietOutline from "@/plugin";
import { store, type Heading } from "@/store";
import { Nav } from "./base";

interface BasesHeading extends Heading {
    /** undefined for group headings */
    row?: number;
}

const FLASH_DURATION = 2000;

export class BasesNav extends Nav {
    declare view: BasesFileView;
    private unwatchData: (() => void) | null = null;
    private flashTimeout = 0;

    constructor(plugin: QuietOutline, view: BasesFileView) {
        super(plugin, view);
    }

    getId(): string {
        return "bases";
    }

    getPath(): string {
        return this.view.file?.path ?? "";
    }

    /** null when the internals this navigator relies on are unavailable */
    private get innerView(): BasesView | null {
        return this.view.controller?.view ?? null;
    }

    async onload(): Promise<void> {
        const controller = this.view.controller;
        if (!controller) return;

        this.watchData();
        // the inner view is replaced when switching view type
        this.registerEvent(
            controller.events.on("view-changed", () => {
                this.watchData();
                this.plugin.refresh();
            }),
        );
        this.register(() => {
            this.unwatchData?.();
            this.unwatchData = null;
            this.clearFlash();
        });
    }

    private watchData() {
        this.unwatchData?.();
        this.unwatchData = null;

        const view = this.innerView;
        if (!view) return;

        const plugin = this.plugin;
        const clearFlash = () => this.clearFlash();
        this.unwatchData = around(view, {
            onDataUpdated(next) {
                return function (this: BasesView, ...args: Parameters<typeof next>) {
                    clearFlash();
                    next.apply(this, args);
                    plugin.refresh();
                };
            },
        });
    }

    async getHeaders(): Promise<BasesHeading[]> {
        const view = this.innerView;
        if (!view?.data) return [];

        const property = this.plugin.settings.bases_display_property.trim() as BasesPropertyId;
        const headers: BasesHeading[] = [];
        for (const group of view.data.groupedData) {
            const grouped = group.hasKey();
            if (grouped) {
                headers.push({
                    level: 1,
                    title: group.key?.toString() || "",
                    icon: "lucide-layers",
                });
            }
            group.entries.forEach((entry, rowIdx) => {
                headers.push({
                    level: grouped ? 2 : 1,
                    title: entryTitle(entry, property),
                    id: entry.file.path,
                    icon: "lucide-file-text",
                    row: rowIdx,
                });
            });
        }
        return headers;
    }

    async setHeaders(): Promise<void> {
        store.headers = await this.getHeaders();
    }

    async updateHeaders(): Promise<void> {
        await this.setHeaders();
    }

    async jump(index: number): Promise<void> {
        const view = this.innerView;
        const header = store.headers[index] as BasesHeading | undefined;
        if (!view?.data || !header) return;

        // the query result is replaced on every vault or config change, so locate the
        // target in the current data instead of trusting indices taken when it was listed
        const target = locate(view.data.groupedData, header);
        if (!target) return;

        const scrollEl = this.view.controller.viewContainerEl;

        // rows are virtualized: only pre-scroll when the target isn't rendered yet,
        // otherwise the estimate jitters an already correct position
        if (!findRowEl(view, target.path)) {
            this.scrollToEstimate(scrollEl, view, target.group, target.row);
            view.updateVirtualDisplay?.();
        }

        const rowEl = findRowEl(view, target.path);
        if (rowEl) {
            this.scrollToTop(scrollEl, rowEl);
            this.flash(rowEl);
        }
    }

    private flash(rowEl: HTMLElement) {
        this.clearFlash();

        rowEl.addClass("is-flashing");
        this.flashTimeout = activeWindow.setTimeout(() => this.clearFlash(), FLASH_DURATION);
    }

    private clearFlash() {
        activeWindow.clearTimeout(this.flashTimeout);
        this.flashTimeout = 0;
        // row elements are pooled, so a stale class may sit on a recycled row
        this.view.controller?.viewContainerEl
            ?.querySelectorAll<HTMLElement>(".is-flashing")
            .forEach(el => el.removeClass("is-flashing"));
    }

    /** align a row with the top of the viewport, below the sticky table header */
    private scrollToTop(scrollEl: HTMLElement, rowEl: HTMLElement) {
        const stickyEl = scrollEl.querySelector<HTMLElement>(".bases-thead");
        const offset = rowEl.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top;

        scrollEl.scrollTo({
            top: scrollEl.scrollTop + toLayoutPx(scrollEl, offset) - (stickyEl?.offsetHeight ?? 0),
            behavior: "smooth",
        });
    }

    private scrollToEstimate(scrollEl: HTMLElement, view: BasesView, groupIdx: number, rowIdx: number) {
        // cards view keeps hidden measuring elements, so read the group objects
        // instead of querying by class name
        const groupEl = view.groups?.[groupIdx]?.containerEl ?? view.groups?.[groupIdx]?.tableEl;
        if (!groupEl?.isConnected) return;

        // assumes rows of a group share one height, which holds for the built-in views
        const groupRect = groupEl.getBoundingClientRect();
        // cards are laid out in a grid, so several entries share one row of height
        const perRow = view.measurements?.cardsPerRow || 1;
        const count = view.data.groupedData[groupIdx].entries.length;
        const within = Math.floor(rowIdx / perRow) / Math.max(Math.ceil(count / perRow), 1);
        const offset = groupRect.top + groupRect.height * within - scrollEl.getBoundingClientRect().top;

        scrollEl.scrollTop += toLayoutPx(scrollEl, offset);
    }
}

/** resolve a listed heading against the current query result, by identity rather than index */
function locate(
    groups: BasesEntryGroup[],
    header: BasesHeading,
): { group: number; row: number; path: string; } | null {
    // a group heading jumps to the first row of its group
    if (header.row === undefined) {
        const group = groups.findIndex(group => (group.key?.toString() || "") === header.title);
        const path = groups[group]?.entries[0]?.file.path;
        return path ? { group, row: 0, path } : null;
    }

    for (let group = 0; group < groups.length; group++) {
        const row = groups[group].entries.findIndex(entry => entry.file.path === header.id);
        if (row !== -1) {
            return { group, row, path: groups[group].entries[row].file.path };
        }
    }
    // the row is gone from the result, eg. filtered out since the outline was built
    return null;
}

/**
 * getBoundingClientRect() is in visual pixels, while scrollTop is in layout pixels;
 * they differ when a zoom level is applied.
 */
function toLayoutPx(el: HTMLElement, px: number): number {
    const rect = el.getBoundingClientRect();
    const scale = rect.height > 0 ? el.clientHeight / rect.height : 1;
    return px * scale;
}

function entryTitle(entry: BasesEntry, property: BasesPropertyId): string {
    if (property) {
        try {
            const title = entry.getValue(property)?.toString().trim();
            if (title) return title;
        } catch {
            // a failing formula property shouldn't empty the whole outline
        }
    }
    return entry.file.basename;
}

function findRowEl(view: BasesView, path: string): HTMLElement | null {
    const pools = [view.rows, view.items, ...(view.groups?.map(group => group.rows) ?? [])];
    for (const pool of pools) {
        const row = pool?.find(row => row.entry?.file.path === path);
        // detached rows are kept for reuse, so only a connected one is really rendered
        if (row?.el.isConnected) return row.el;
    }
    return null;
}
