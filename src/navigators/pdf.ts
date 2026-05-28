import type { PdfView, PdfDestination, ObsidianPdfViewerLike, PdfOutlineItemData } from "obsidian";
import { Nav } from "./base";
import type QuietOutline from "@/plugin";
import { store, type Heading } from "@/store";


interface PdfHeading extends Heading {
    dest?: PdfDestination;
}

const PDF_OUTLINE_LOAD_TIMEOUT = 3000;

export class PdfNav extends Nav {
    outline: PdfOutlineItemData[] = [];
    view: PdfView;

    get pdfViewer(): ObsidianPdfViewerLike | null | undefined {
        return this.view.viewer.child?.pdfViewer;
    }

    constructor(plugin: QuietOutline, view: PdfView) {
        super(plugin, view);
        this.view = view;
    }

    async onload(): Promise<void> {
    }

    getId(): string {
        return "pdf";
    }

    async jump(index: number): Promise<void> {
        const dest = getHeaders(index).dest;
        if (dest) {
            this.pdfViewer?.pdfOutlineViewer.linkService.goToDestination(dest);
        }
    }
    async getHeaders(): Promise<PdfHeading[]> {
        return traverseOutlineItems(await this.waitForPdfOutline() || [], 1);

    }
    async setHeaders(): Promise<void> {
        store.headers = await this.getHeaders();
    }
    async updateHeaders(): Promise<void> {
        await this.setHeaders();
    }

    waitForPdfOutline(): Promise<PdfOutlineItemData[] | null> {
        return new Promise((resolve) => {
            const pdfViewer = this.pdfViewer;
            const outlineViewer = pdfViewer?.pdfOutlineViewer;
            if (!pdfViewer || !outlineViewer) {
                resolve(null);
                return;
            }

            // 如果已经有 outline，直接返回。
            if (outlineViewer.outline) {
                resolve(outlineViewer.outline);
                return;
            }

            let finished = false;
            const finish = (outline: PdfOutlineItemData[] | null) => {
                if (finished) { return; }
                finished = true;
                window.clearTimeout(timeoutId);
                pdfViewer.eventBus._off("outlineloaded", onOutlineLoaded);
                resolve(outline);
            };

            const timeoutId = window.setTimeout(() => {
                finish(null);
            }, PDF_OUTLINE_LOAD_TIMEOUT);

            const onOutlineLoaded = (event: { outlineCount: number; }) => {
                finish(event.outlineCount > 0 ? outlineViewer.outline : null);
            };

            pdfViewer.eventBus._on("outlineloaded", onOutlineLoaded);
        });
    }
}

function getHeaders(index: number) {
    return store.headers[index] as PdfHeading;
}

function traverseOutlineItems(items: PdfOutlineItemData[], level: number): PdfHeading[] {
    const result: PdfHeading[] = [];
    for (const item of items) {
        result.push(outlineItemToPdfHeading(item, level));
        if (item.items) {
            result.push(...traverseOutlineItems(item.items, level + 1));
        }
    }
    return result;
}

function outlineItemToPdfHeading(item: PdfOutlineItemData, level: number): PdfHeading {
    return {
        level,
        title: item.title,
        dest: item.dest
    };
}
