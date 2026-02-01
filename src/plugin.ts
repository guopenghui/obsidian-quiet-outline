import { around } from "monkey-around";
import {
    Component,
    type Constructor,
    debounce,
    FileView,
    Plugin,
    TFile,
    View,
    WorkspaceLeaf
} from "obsidian";

import { Nav, createNav } from "./navigators";
import { store } from "./store";
import { OutlineView, VIEW_TYPE } from "./ui/view";
import { debounceCb } from "./utils/debounce";

import { type MarkdownStates, MD_DATA_FILE } from "./navigators/markdown";
import { DEFAULT_SETTINGS, type QuietOutlineSettings, SettingTab } from "./settings";
import { DataManager } from "./utils/data-manager";
import { registerCommands } from "./commands";
import { eventBus } from "./utils/event-bus";

import "./stalin.css";
import { Deferred } from "./utils/promise";

export default class QuietOutline extends Plugin {
    settings!: QuietOutlineSettings;
    navigator: Nav = createNav("dummy", this, null);
    jumping = Deferred.resolved();
    klasses: Record<string, Constructor<any>> = {};
    data_manager!: DataManager;
    outlineView: OutlineView | null = null;

    allow_scroll = true;
    block_scroll!: () => void;
    allow_cursor_change = true;
    block_cursor_change!: () => void;
    private prevActiveFile: TFile | null = null;
    private prevActiveFileView: FileView | null = null;
    private prevView: View | null = null;

    async startJumping() {
        const jumping = this.jumping = new Deferred();
        // end jumping after scroll event or timeout
        await Promise.race([jumping.promise, sleep(1000)]);

        jumping.resolve();
    }

    async onload() {
        await this.loadSettings();
        this.data_manager = new DataManager(this.app, this.getPluginPath());
        await this.data_manager.loadFileData<MarkdownStates>(MD_DATA_FILE, {});

        // TEST: 测试插件功能
        // this.addRibbonIcon('bot', 'test something', (evt) => {
        // 	const view = this.app.workspace.getActiveViewOfType(MarkdownView)
        // 	console.dir(view.getState())
        // })

        store.init(this);

        this.registerView(VIEW_TYPE, (leaf) => new OutlineView(leaf, this));
        this.registerListener();
        registerCommands(this);
        this.addSettingTab(new SettingTab(this.app, this));

        // only manually activate view when first time install
        if (await this.firstTimeInstall()) {
            this.app.workspace.onLayoutReady(() => {
                this.activateView();
                this.saveSettings();
            });
        }

        this.block_scroll = debounceCb(
            () => { this.allow_scroll = false; },
            300,
            () => { this.allow_scroll = true; },
        );
        this.block_cursor_change = debounceCb(
            () => { this.allow_cursor_change = false; },
            300,
            () => { this.allow_cursor_change = true; },
        );
    }

    private async firstTimeInstall() {
        const existSettingFile = await this.app.vault.adapter.exists(
            this.manifest.dir + "/data.json",
        );
        return !existSettingFile;
    }

    private registerListener() {
        this.registerEvent(
            this.app.workspace.on("css-change", () => {
                store.dark = document.body.hasClass("theme-dark");
                store.cssChange = !store.cssChange;
            }),
        );

        this.registerEvent(
            this.app.metadataCache.on("changed", () => {
                this.refresh("file-modify");
            }),
        );

        this.registerEvent(
            this.app.workspace.on("active-leaf-change", async (leaf) => {
                const prevView = this.prevView;
                this.prevView = leaf?.view || null;
                if (!leaf) return;

                const activeFileView = this.app.workspace.getActiveFileView();
                if (!activeFileView) {
                    this.prevActiveFileView = null;
                    this.prevActiveFile = null;
                    eventBus.trigger("active-fileview-change", null);
                    return;
                }

                if (leaf.view instanceof FileView && leaf.view.file) {
                    // when opening a canvas, it triggers active-leaf-change twice
                    // and at the first time it's not ready
                    const isCanvasTwice = leaf.view.getViewType() === "canvas"
                        && this.prevActiveFileView === leaf.view
                        && leaf.view === prevView;

                    if (leaf.view !== this.prevActiveFileView
                        || leaf.view.file !== this.prevActiveFile
                        || isCanvasTwice
                    ) {
                        this.prevActiveFileView = leaf.view;
                        this.prevActiveFile = leaf.view.file;
                        eventBus.trigger("active-fileview-change", leaf.view);
                    }
                }
            })
        );

        this.registerEvent(
            eventBus.on("active-fileview-change", async (view) => {
                if (this.outlineView?.leaf?.group) { return; }

                if (!view) {
                    await this.updateNavAndRefresh("dummy", null);
                    return;
                }

                // block cursor change event to trigger auto-expand when switching between notes
                this.block_cursor_change();
                await this.updateNavAndRefresh(view.getViewType(), view);
            }),
        );

        // patch leaf.setViewState early to restore markdown scroll/cursor position
        /* oxlint-disable no-this-alias */
        const plugin = this;
        this.register(around(WorkspaceLeaf.prototype, {
            setViewState(next) {
                return async function (this: WorkspaceLeaf, viewState, eState) {
                    if (viewState.type !== "markdown") {
                        return next.apply(this, [viewState, eState]);
                    }

                    if (plugin.settings.persist_md_states) {
                        const states = plugin.data_manager.getData<MarkdownStates>(MD_DATA_FILE)!;
                        const data = states[<string>viewState.state?.file ?? ""];
                        if (data) {
                            eState = eState || {};
                            eState.scroll = data.scroll;
                            eState.cursor = data.cursor;
                        }
                    }
                    return next.apply(this, [viewState, eState]);
                };
            }
        }));
    }

    // set store.headers
    refresh_outline = async (reason?: "file-modify") => {
        if (reason === "file-modify") {
            await this.navigator.updateHeaders();
        } else {
            await this.navigator.setHeaders();
        }
    };

    refresh = debounce(this.refresh_outline, 300, true);

    private async updateNav(type: string, view: Component | null) {
        await this.navigator.unload();
        this.navigator = createNav(type, this, view);
        await this.navigator.load();
    }

    async updateNavAndRefresh(type: string, view: Component | null) {
        await this.updateNav(type, view);

        // update naive-ui tree's data and expandedKey in the same tick
        // to avoid animation-in-progress stuck
        // https://github.com/tusen-ai/naive-ui/issues/5217
        const newHeaders = await this.navigator.getHeaders();
        store.headers = newHeaders;
        this.outlineView?.vueInstance.onLeafChange();
    }

    async onunload() {
        await this.navigator.unload();
        this.outlineView = null;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    getPluginPath() {
        return this.manifest.dir!;
    }

    async activateView() {
        if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length === 0) {
            await this.app.workspace.getRightLeaf(false)?.setViewState({
                type: VIEW_TYPE,
                active: true,
            });
        }
        this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(VIEW_TYPE)[0],
        );
    }
}
