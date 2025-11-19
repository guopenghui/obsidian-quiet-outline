import { ItemView, Scope, WorkspaceLeaf } from "obsidian";
import { createApp, App } from "vue";
import Outline from "./Outline.vue";
import type { QuietOutline } from "../plugin";

export const VIEW_TYPE = "quiet-outline";

export class OutlineView extends ItemView {
    vueApp: App;
    vueInstance: InstanceType<typeof Outline>;
    plugin: QuietOutline;
    scopes: Record<string, Scope>;
    pendingKey?: string;
    constructor(leaf: WorkspaceLeaf, plugin: QuietOutline) {
        super(leaf);
        this.plugin = plugin;

        this.setupScopes();
    }

    getViewType(): string {
        return VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Quiet Outline";
    }

    getIcon(): string {
        return "lines-of-text";
    }

    async onOpen(this: OutlineView) {
        const container = this.containerEl.children[1];
        container.empty();
        const mountPoint = container.createEl("div", {
            cls: "quiet-outline",
        });
        this.vueApp = createApp(Outline);
        this.vueApp.provide("plugin", this.plugin);
        this.vueApp.provide("container", mountPoint);
        // this.vueApp.config.globalProperties.plugin = this.plugin;
        // this.vueApp.config.globalProperties.container = mountPoint;
        this.vueInstance = this.vueApp.mount(mountPoint) as InstanceType<
            typeof Outline
        >;
        // setTimeout(()=> { createApp(Outline).mount(mountPoint) }, 0)
    }

    setupScopes() {
        const tree = new Scope(this.app.scope);
        tree.register([], "H", () => this.vueInstance.setExpand(false));
        tree.register([], "J", () => this.vueInstance.move("down"));
        tree.register([], "K", () => this.vueInstance.move("up"));
        tree.register([], "L", () => this.vueInstance.setExpand(true));
        tree.register([], "G", () => {
            if(this.pendingKey === "G") {
                this.vueInstance.move("top")
                this.pendingKey = undefined;
                return;
            }
            this.pendingKey = "G";
            setTimeout(() => this.pendingKey = undefined, 500);
        });
        tree.register([], "Z", () => {
            if(this.pendingKey === "Z") {
                this.vueInstance.center();
                this.pendingKey = undefined;
                return;
            }
            this.pendingKey = "Z";
            setTimeout(() => this.pendingKey = undefined, 500);
        });
        tree.register(["Shift"], "G", () => this.vueInstance.move("bottom"));
        tree.register([], "ArrowLeft", () => this.vueInstance.setExpand(false));
        tree.register([], "ArrowDown", () => this.vueInstance.move("down"));
        tree.register([], "ArrowUp", () => this.vueInstance.move("up"));
        tree.register([], "ArrowRight", () => this.vueInstance.setExpand(true));
        tree.register([], "/", (evt) => {
            evt.preventDefault();
            this.focusOn("search");
        });
        tree.register([], " ", (evt) => {
            evt.preventDefault();
            const idx = this.vueInstance.currentSelected();
            if (idx === undefined) return;
            this.plugin.navigator.jumpWithoutFocus(idx);
        });
        tree.register([], "Enter", () => {
            const idx = this.vueInstance.currentSelected();
            if(idx !== undefined) {
                this.plugin.navigator.jump(idx);
                this.vueInstance.resetPattern();
            }
        });
        tree.register(null, null, (evt) => {
            if(evt.key !== "Escape") return;
            setTimeout(() => {
                this.plugin.app.workspace.activeLeaf?.setEphemeralState({ focus: true })
            });
        })

        const search = new Scope(this.app.scope);
        search.register([], "Escape", () => this.vueInstance.resetPattern())
        search.register([], "Enter", () => this.focusOn("tree"))

        const switcher = new Scope(this.app.scope);

        this.scopes = {
            tree,
            search,
            switcher,
        };
    }

    focusOn(part: "search" | "tree") {
        switch (part) {
            case "tree":
                const tree: HTMLElement =
                    this.contentEl.querySelector(".n-tree")!;
                tree.focus();
                this.scope = this.scopes.tree;
                this.vueInstance.selectVisible();
                break;
            case "search":
                const search: HTMLElement =
                    this.contentEl.querySelector(".n-input__input-el")!;
                search.focus();
                this.scope = this.scopes.search;
                // this.vueInstance.resetPattern();
                break;
        }
    }

    async onClose() {}
    onunload(): void {
        this.vueApp.unmount();
    }
}
