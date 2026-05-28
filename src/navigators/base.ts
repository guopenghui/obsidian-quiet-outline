import { type Component, type EventRef, Menu } from "obsidian";
import type QuietOutline from "@/plugin";
import { store, type Heading } from "@/store";
import type { TreeOption } from "naive-ui";
import { Deferred } from "@/utils/promise";

/* oxlint-disable no-unused-vars */
export abstract class Nav {
    private _used = false; // a navigator only allowed to be used once
    private _loaded = new Deferred();
    private _events: (() => void | Promise<void>)[] = [];
    canDrop: boolean = false;
    plugin: QuietOutline;
    view: Component | null;

    constructor(plugin: QuietOutline, view: Component | null) {
        this.plugin = plugin;
        this.view = view;
    }
    async load(): Promise<void> {
        if (this._used) return;
        this._used = true;

        // @ts-ignore
        if (!this.constructor._installed) {
            await this.install();
            // @ts-ignore
            this.constructor._installed = true;
        }
        await this.onload();

        this._loaded.resolve();
    }
    async unload(): Promise<void> {
        // make sure navigator is loaded before unloading
        await this._loaded.promise;

        for (; this._events.length > 0;) {
            await this._events.pop()?.();
        };

        await this.onunload();

        // for navigator safe: avoid invalid navigator
        this.plugin.navigator = new DummyNav(this.plugin, null);
    }
    register(cb: () => void | Promise<void>): void {
        this._events.push(cb);
    }
    registerEvent(eventRef: EventRef): void {
        this.register(() => {
            eventRef.e?.offref(eventRef);
        });
    }
    registerDomEvent<K extends keyof WindowEventMap>(
        el: Window,
        type: K,
        callback: (this: HTMLElement, ev: WindowEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ): void;
    registerDomEvent<K extends keyof DocumentEventMap>(
        el: Document,
        type: K,
        callback: (this: HTMLElement, ev: DocumentEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ): void;
    registerDomEvent<K extends keyof HTMLElementEventMap>(
        el: HTMLElement,
        type: K,
        callback: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ): void;
    registerDomEvent(
        el: Window | Document | HTMLElement,
        type: string,
        callback: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void {
        el.addEventListener(type, callback, options);
        this.register(() => {
            el.removeEventListener(type, callback, options);
        });
    }
    registerInterval(id: number): number {
        this.register(() => {
            window.clearInterval(id);
        });
        return id;
    }
    getDefaultLevel() {
        return parseInt(this.plugin.settings.expand_level);
    }
    getPath() { return ""; }
    abstract getId(): string;
    async install() { }
    async onload(): Promise<void> { }
    async onunload(): Promise<void> { }
    async handleDrop(
        _from: number,
        _to: number,
        _position: "before" | "after" | "inside",
    ) { }
    onRightClick(
        _event: MouseEvent,
        _nodeInfo: { node: TreeOption; no: number; level: number; raw: string; },
        _menu: Menu,
        _onClose?: () => void,
    ) { }
    toBottom() { }
    onExpandKeysChange(_path: string, _keys: string[]) { }
    changeHeadingContent(_no: number, _content: string) { }
    abstract jump(key: number): Promise<void>;
    async jumpWithoutFocus(index: number) { await this.jump(index); }
    async jumpWhenClick(index: number) { await this.jumpWithoutFocus(index); }
    abstract getHeaders(): Promise<Heading[]>;
    abstract setHeaders(): Promise<void>;
    abstract updateHeaders(): Promise<void>;
}

export class DummyNav extends Nav {
    getId() { return "dummy"; }
    async unload() { }
    async jump(_index: number) { }
    async getHeaders(): Promise<Heading[]> { return []; }
    async setHeaders(): Promise<void> { store.headers = []; }
    async updateHeaders() { }
}
