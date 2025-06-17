import { reactive } from 'vue';
import type { HeadingCache } from 'obsidian';

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

export function getParent(headId: number, headings:Heading[]): number {
	for (let i = headId; i >= 0; i--) {
		if (headings[i].level < headings[headId].level) return i;
	}
	return -1;
}

// -1 表示根
export function getChildren(headId: number, headings:Heading[]): Set<number> {
	if (headId === -1) return new Set(headings.map((_, i) => i));
	const children = [];
	for (let i = headId + 1; i < headings.length; i++) {
		if (headings[i].level <= headings[headId].level) break;
		
		children.push(i);
	}
	return new Set(children);
}

export function getSiblings(headId: number, headings:Heading[]): Set<number> {
	const parent = getParent(headId, headings);
	const children = getChildren(parent, headings);
	
	const siblings = [...children].filter(h => headings[h].level === headings[headId].level)
	return new Set(siblings);
}

export type ModifyKeys = {
    offsetModifies: {
        begin: number,
        offset: number,
    }[]
    removes: {
        begin: number,
        length: number,
    }[]
    adds: {
        begin: number,
    }[]
	modifies: {
		oldBegin: number,
		newBegin: number, 
		levelChangeType: "parent2parent" | "parent2child" | "child2parent",
	}[]
}

const store = reactive({
    activeView() {
        this.plugin.activateView();
        this.refreshTree();
    },
    headers: [] as Heading[],
	onPosChange: (index: number) => {},
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
    // autoExpand: true,
    modifyKeys: {} as ModifyKeys,
    dragModify: false,
    textDirectionDecideBy: "system" as "system" | "text",
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
});

export { store };
