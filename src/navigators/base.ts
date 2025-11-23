import { Component, HeadingCache, Menu } from "obsidian";
import type { QuietOutline } from "@/plugin";
import { store } from "@/store";
import { TreeOption } from "naive-ui";

export abstract class Nav extends Component {
    private _loaded: boolean = false;
    canDrop: boolean = false;
    plugin: QuietOutline;
    view: Component | null;

    constructor(plugin: QuietOutline, view: Component | null) {
        super();
        this.plugin = plugin;
        this.view = view;
    }
    async load(): Promise<void> {
        if (this._loaded) return;

        this._loaded = true;
        // @ts-ignore
        if (!this.constructor._installed) {
            await this.install();
            // @ts-ignore
            this.constructor._installed = true;
        }
        await this.onload();

        this.view?.addChild(this);
    }
    async unload(): Promise<void> {
        if (!this._loaded) return;
        this._loaded = false;
        // @ts-ignore
        for (; this._events.length > 0; ) this._events.pop()();

        await this.onunload();

        this.view?.removeChild(this);
        // for navigator safe: avoid invalid navigator
        this.plugin.navigator = new DummyNav(this.plugin, null);
    }
    getDefaultLevel() {
        return parseInt(this.plugin.settings.expand_level);
    }
    getPath() {
        return "";
    }
    abstract getId(): string;
    async install() {}
    async onload(): Promise<void> {}
    async onunload(): Promise<void> {}
    async handleDrop(
        from: number,
        to: number,
        position: "before" | "after" | "inside",
    ) {}
    onRightClick(
        event: MouseEvent,
        nodeInfo: { node: TreeOption; no: number; level: number; raw: string },
        menu: Menu,
        onClose?: () => void,
    ) {}
    toBottom() {}
    onExpandKeysChange(path: string, keys: string[]) {}
    changeContent(no: number, content: string) {}
    abstract jump(key: number): Promise<void>;
    async jumpWithoutFocus(key: number) { this.jump(key); }
    async jumpWhenClick(key: number) { this.jumpWithoutFocus(key); }
    abstract getHeaders(): Promise<HeadingCache[]>;
    abstract setHeaders(): Promise<void>;
    abstract updateHeaders(): Promise<void>;
}

export class DummyNav extends Nav {
    getId() {
        return "dummy";
    }
    async jump(_key: number) {}
    async getHeaders(): Promise<HeadingCache[]> {
        return [];
    }
    async setHeaders(): Promise<void> {
        store.headers = [];
    }
    async updateHeaders() {}
}
