import { reactive } from 'vue';
import { HeadingCache, MarkdownView } from 'obsidian';


const store = reactive({
    activeView() {
        this.plugin.activateView();
        this.refreshTree();
    },
    headers: [] as HeadingCache[],
    dark: true,
    markdown: true,
    ellipsis: false,
    leafChange: false,
    searchSupport: true,
    levelSwitch: true,
    hideUnsearched: true,
    regexSearch: false,
    autoExpand: true,
    dragModify: false,
    refreshTree() {
        this.leafChange = !this.leafChange;
    },

    currentNote: null as MarkdownView
});

export { store };