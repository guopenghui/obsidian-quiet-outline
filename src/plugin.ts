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

import "./stalin.css";

const SUPPORTED_VIEW_TYPES = ["markdown", "canvas", "kanban"];

export default class QuietOutline extends Plugin {
    settings!: QuietOutlineSettings;
    navigator: Nav = createNav("dummy", this, null);
    jumping: boolean = false;
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

    async onload() {
        await this.loadSettings();
        this.data_manager = new DataManager(this.app, this.getPluginPath());
        await this.data_manager.loadFileData<MarkdownStates>(MD_DATA_FILE, {});

        // TEST: 测试插件功能
        // this.addRibbonIcon('bot', 'test something', (evt) => {
        // 	const view = this.app.workspace.getActiveViewOfType(MarkdownView)
        // 	console.dir(view.getState())
        // })

        this.initStore();
        this.registerView(VIEW_TYPE, (leaf) => new OutlineView(leaf, this));
        this.registerListener();
        registerCommands(this);
        this.addSettingTab(new SettingTab(this.app, this));

        // only manually activate view when first time install
        if (await this.firstTimeInstall()) {
            this.activateView();
            await this.saveSettings();
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

    private initStore() {
        store.headers = [];
        store.dark = document.body.hasClass("theme-dark");
        store.markdown = this.settings.markdown;
        store.ellipsis = this.settings.ellipsis;
        store.labelDirection = this.settings.label_direction;
        store.refreshTree = () => {
            this.outlineView?.vueInstance.forceRemakeTree();
            this.app.workspace.trigger("layout-change");
        };
        store.searchSupport = this.settings.search_support;
        store.levelSwitch = this.settings.level_switch;
        store.hideUnsearched = this.settings.hide_unsearched;
        store.regexSearch = this.settings.regex_search;
        store.dragModify = this.settings.drag_modify;
        store.textDirectionDecideBy = this.settings.lang_direction_decide_by;
        store.patchColor = this.settings.patch_color;
        store.primaryColorLight = this.settings.primary_color_light;
        store.primaryColorDark = this.settings.primary_color_dark;
        store.rainbowLine = this.settings.rainbow_line;
        store.rainbowColor1 = this.settings.rainbow_color_1;
        store.rainbowColor2 = this.settings.rainbow_color_2;
        store.rainbowColor3 = this.settings.rainbow_color_3;
        store.rainbowColor4 = this.settings.rainbow_color_4;
        store.rainbowColor5 = this.settings.rainbow_color_5;
        store.fontSize = this.settings.font_size;
        store.fontFamily = this.settings.font_family;
        store.fontWeight = this.settings.font_weight;
        store.lineHeight = this.settings.line_height;
        store.lineGap = this.settings.line_gap;
        store.customFontColor = this.settings.custom_font_color;
        store.h1Color = this.settings.h1_color;
        store.h2Color = this.settings.h2_color;
        store.h3Color = this.settings.h3_color;
        store.h4Color = this.settings.h4_color;
        store.h5Color = this.settings.h5_color;
        store.h6Color = this.settings.h6_color;
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
                    this.app.workspace.trigger("quiet-outline:active-fileview-change", null);
                    return;
                }

                if (leaf.view instanceof FileView && SUPPORTED_VIEW_TYPES.contains(leaf.view.getViewType()) && leaf.view.file) {
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
                        this.app.workspace.trigger("quiet-outline:active-fileview-change", leaf.view);
                    }
                }
            })
        );

        this.registerEvent(
            this.app.workspace.on("quiet-outline:active-fileview-change", async (view) => {
                const outlineView = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
                if (outlineView?.group) { return; }

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
        this.outlineView?.vueInstance.handleLeafChange();
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
        // fix console error
        // https://github.com/guopenghui/obsidian-quiet-outline/issues/154
        if (this.app.workspace.rightSplit === null) return;

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
