import { Events, type FileView, type EventRef, type CanvasComponent } from "obsidian";

export type QuietOutlineEventMap = {
    "reset-panel": [];
    "levelchange": [level: number | "inc" | "dec"];
    "cursorchange": [docChanged: boolean];
    "active-fileview-change": [fileView: FileView | null];
    "canvas-change": [];
    "canvas-selection-change": [selection: Set<CanvasComponent>];
};

export type EventName = keyof QuietOutlineEventMap;

type EventHandler<K extends EventName> =
    (...args: QuietOutlineEventMap[K]) => void;

class EventBus extends Events {
    on<K extends EventName>(
        name: K,
        callback: (...args: QuietOutlineEventMap[K]) => void,
        ctx?: any
    ): EventRef;
    on(name: string, callback: (...data: any[]) => any, ctx?: any): EventRef {
        return super.on(name, callback, ctx);
    }
    off<K extends EventName>(name: K, callback: EventHandler<K>): void;
    off(name: string, callback: (...data: any[]) => any): void {
        super.off(name, callback);
    }
    trigger<K extends EventName>(name: K, ...data: QuietOutlineEventMap[K]): void;
    trigger(name: string, ...data: unknown[]): void {
        super.trigger(name, ...data);
    }
}

export const eventBus = new EventBus();
