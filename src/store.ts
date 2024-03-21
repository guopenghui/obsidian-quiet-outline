import { reactive } from 'vue';
import { HeadingCache, MarkdownView } from 'obsidian';
import { dummyJump } from "./plugin"

export type SupportedIcon = 
      "AudiotrackOutlined" 
    | "OndemandVideoOutlined"
    | "ArticleOutlined" 
    | "ImageOutlined" 
    | "TextFieldsOutlined" 
    | "CategoryOutlined" 
    | "PublicOutlined" 
    | "FilePresentOutlined"

export type Heading = HeadingCache & {
    id?: string,
    icon?: SupportedIcon,
}

const store = reactive({
    activeView() {
        this.plugin.activateView();
        this.refreshTree();
    },
    headers: [] as Heading[],
    jumpBy: dummyJump,
    dark: true,
    cssChange: false,
    markdown: true,
    ellipsis: false,
    labelDirection: "left" as "top" | "bottom" | "left" | "right",
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
    patchColor: false,
    primaryColorLight: "",
    primaryColorDark: "",
    rainbowLine: false,
    rainbowColor1: "",
    rainbowColor2: "",
    rainbowColor3: "",
    rainbowColor4: "",
    rainbowColor5: "",
    currentNote: null as MarkdownView
});

export { store };