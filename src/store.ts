import { reactive } from "vue";
import type { HeadingCache } from "obsidian";
import type QuietOutline from "./plugin";

export type SupportedIcon = string;

export type Heading = HeadingCache & {
    id?: string;
    icon?: SupportedIcon;
};

export function getParent(headId: number, headings: Heading[]): number {
    for (let i = headId; i >= 0; i--) {
        if (headings[i].level < headings[headId].level) return i;
    }
    return -1;
}

// -1 表示根
export function getChildren(headId: number, headings: Heading[]): Set<number> {
    if (headId === -1) return new Set(headings.map((_, i) => i));
    const children = [];
    for (let i = headId + 1; i < headings.length; i++) {
        if (headings[i].level <= headings[headId].level) break;

        children.push(i);
    }
    return new Set(children);
}

export function getSiblings(headId: number, headings: Heading[]): Set<number> {
    const parent = getParent(headId, headings);
    const children = getChildren(parent, headings);

    const siblings = [...children].filter(
        (h) => headings[h].level === headings[headId].level,
    );
    return new Set(siblings);
}

export type ModifyKeys = {
    offsetModifies: {
        begin: number;
        offset: number;
    }[];
    removes: {
        begin: number;
        length: number;
    }[];
    adds: {
        begin: number;
    }[];
    modifies: {
        oldBegin: number;
        newBegin: number;
        levelChangeType: "parent2parent" | "parent2child" | "child2parent";
    }[];
};

export const store = reactive({
    headers: [] as Heading[],
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
    currentEditingKey: "",
    modifyKeys: {} as ModifyKeys,
    dragModify: false,
    textDirectionDecideBy: "system" as "system" | "text",
    refreshTree: () => { },
    theme: {
        patchColor: false,
        primaryColorLight: "",
        primaryColorDark: "",
        rainbowLine: false,
        rainbowColor1: "",
        rainbowColor2: "",
        rainbowColor3: "",
        rainbowColor4: "",
        rainbowColor5: "",
        fontSize: "",
        fontFamily: "",
        fontWeight: "",
        lineHeight: "",
        lineGap: "",
        customFontColor: false,
        h1ColorLight: "",
        h2ColorLight: "",
        h3ColorLight: "",
        h4ColorLight: "",
        h5ColorLight: "",
        h6ColorLight: "",
        h1ColorDark: "",
        h2ColorDark: "",
        h3ColorDark: "",
        h4ColorDark: "",
        h5ColorDark: "",
        h6ColorDark: "",
    },
    init,
});

function init(plugin: QuietOutline) {
    const { app, settings } = plugin;
    store.dark = document.body.hasClass("theme-dark");
    store.markdown = settings.markdown;
    store.ellipsis = settings.ellipsis;
    store.labelDirection = settings.label_direction;
    store.refreshTree = () => {
        plugin.outlineView?.vueInstance.forceRemakeTree();
        app.workspace.trigger("layout-change");
    };
    store.searchSupport = settings.search_support;
    store.levelSwitch = settings.level_switch;
    store.hideUnsearched = settings.hide_unsearched;
    store.regexSearch = settings.regex_search;
    store.dragModify = settings.drag_modify;
    store.textDirectionDecideBy = settings.lang_direction_decide_by;
    store.theme.patchColor = settings.patch_color;
    store.theme.primaryColorLight = settings.primary_color_light;
    store.theme.primaryColorDark = settings.primary_color_dark;
    store.theme.rainbowLine = settings.rainbow_line;
    store.theme.rainbowColor1 = settings.rainbow_color_1;
    store.theme.rainbowColor2 = settings.rainbow_color_2;
    store.theme.rainbowColor3 = settings.rainbow_color_3;
    store.theme.rainbowColor4 = settings.rainbow_color_4;
    store.theme.rainbowColor5 = settings.rainbow_color_5;
    store.theme.fontSize = settings.font_size;
    store.theme.fontFamily = settings.font_family;
    store.theme.fontWeight = settings.font_weight;
    store.theme.lineHeight = settings.line_height;
    store.theme.lineGap = settings.line_gap;
    store.theme.customFontColor = settings.custom_font_color;
    store.theme.h1ColorLight = settings.h1_color;
    store.theme.h2ColorLight = settings.h2_color;
    store.theme.h3ColorLight = settings.h3_color;
    store.theme.h4ColorLight = settings.h4_color;
    store.theme.h5ColorLight = settings.h5_color;
    store.theme.h6ColorLight = settings.h6_color;
    store.theme.h1ColorDark = settings.h1_color_dark;
    store.theme.h2ColorDark = settings.h2_color_dark;
    store.theme.h3ColorDark = settings.h3_color_dark;
    store.theme.h4ColorDark = settings.h4_color_dark;
    store.theme.h5ColorDark = settings.h5_color_dark;
    store.theme.h6ColorDark = settings.h6_color_dark;
}
