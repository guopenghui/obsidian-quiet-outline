import { ItemView, WorkspaceLeaf } from 'obsidian'
import { createApp } from 'vue'
import Outline from './Outline.vue'

export const VIEW_TYPE: string = 'quiet-outline'

export class OutlineView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf)
    }

    getViewType(): string {
        return VIEW_TYPE
    } 

    getDisplayText(): string{
        return "Quiet Outline"
    }

    getIcon(): string{
        return "lines-of-text"
    }

    async onOpen(this:OutlineView) {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("div", { 
            cls: "quiet-outline"
        })
        setTimeout(()=> { createApp(Outline).mount('.quiet-outline') }, 0)
    }

    async onClose() {
        
    }

}