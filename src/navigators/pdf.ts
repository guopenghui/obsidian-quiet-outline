import { type PdfView, type PdfDestination, type ObsidianPdfViewerLike, type PdfOutlineItemData, type PdfEvent, type PdfViewerChild, debounce } from "obsidian";
import { Nav } from "./base";
import type QuietOutline from "@/plugin";
import { store, type Heading } from "@/store";
import { Deferred } from "@/utils/promise";
import { toRaw } from "vue";

interface PdfHeading extends Heading {
    dest: PdfDestination | undefined;
    item: PdfOutlineItemData;
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

    async ready(): Promise<PdfViewerChild | null> {
        const deferred = new Deferred<PdfViewerChild>();
        this.view.viewer.then(child => {
            deferred.resolve(child);
        });

        const child = await Promise.race([deferred.promise, sleep(3000).then(() => null)]);
        await this.waitForPdfOutline();

        return child;
    }

    async onload(): Promise<void> {
        const child = await this.ready();
        if (!child) {
            return;
        }

        this.listenToPageChange(child);
    }

    listenToPageChange(child: PdfViewerChild) {
        const allItems = [...(child.pdfViewer?.pdfOutlineViewer.allItems ?? [])]
            .sort((a, b) => a.pageNumber - b.pageNumber);

        const callback = debounce(async (event: PdfEvent) => {
            if (allItems.length === 0 || store.headers.length === 0) {
                return;
            }

            // Find the last pageNumber less than event.pageNumber
            // or the first pageNumber equal to the event pageNumber
            const index = allItems.findLastIndex((item) => {
                return item.pageNumber < event.pageNumber;
            });

            let toIndex = 0;
            if (index < allItems.length - 1 && allItems[index + 1].pageNumber === event.pageNumber) {
                toIndex = index + 1;
            } else if (index !== -1) {
                toIndex = index;
            }

            let indexOfStoreHeader = (store.headers as PdfHeading[])
                .findIndex((header) => toRaw(header.item) === allItems[toIndex].item);

            if (indexOfStoreHeader !== -1) {
                this.plugin.outlineView?.vueInstance.onPosChange(indexOfStoreHeader);
            }
        }, 50, true);

        child.on("pagechanging", callback);
        this.register(() => child.off("pagechanging", callback));
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
        dest: item.dest,
        item,
    };
}
