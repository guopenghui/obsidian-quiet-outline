import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createApp, App } from 'vue';
import Outline from './Outline.vue';
import { QuietOutline } from "./plugin";

export const VIEW_TYPE: string = 'quiet-outline';

export class OutlineView extends ItemView {
    vueApp: App;
    plugin: QuietOutline;
    constructor(leaf: WorkspaceLeaf, plugin: QuietOutline) {
        super(leaf);
        this.plugin = plugin;
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
        const container = this.containerEl;
        container.empty();
        const mountPoint = container.createEl("div", {
            cls: "quiet-outline"
        });
        this.vueApp = createApp(Outline);
        this.vueApp.config.globalProperties.plugin = this.plugin;
        this.vueApp.config.globalProperties.container = mountPoint;
        this.vueApp.mount(mountPoint);
        // setTimeout(()=> { createApp(Outline).mount(mountPoint) }, 0)
    }

    async onClose() {
    }
    onunload(): void {
        this.vueApp.unmount();
    }

}