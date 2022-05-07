import { reactive } from 'vue'
import { HeadingCache } from 'obsidian'
import { QuietOutline } from './plugin'


const store = reactive({
    plugin: undefined as QuietOutline,

    activeView() {
        this.plugin.activateView()
        this.refreshTree()
    },

    headers: [] as HeadingCache[],
    dark: false,

    leaf_change: false,
    refreshTree() {
        this.leaf_change = !this.leaf_change
    },
})

export { store }