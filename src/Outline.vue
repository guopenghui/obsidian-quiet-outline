<template>
    <div id="container">
        <NConfigProvider :theme="theme" :theme-overrides="theme === null ? lightThemeConfig : darkThemeConfig">
            <div class="function-bar" v-if="store.searchSupport">
                <NButton size="small" circle @click="reset">
                    <template #icon>
                        <Icon>
                            <SettingsBackupRestoreRound :style="iconColor" />
                        </Icon>
                    </template>
                </NButton>
                <NInput v-model:value="pattern" placeholder="Input to search" size="small" clearable />
            </div>
            <NSlider v-if="store.levelSwitch" v-model:value="level" :marks="marks" step="mark" :min="0" :max="5"
                style="margin:4px 0;" :format-tooltip="formatTooltip" />
            <code v-if="pattern">{{ matchCount }} result(s): </code>
            <NTree block-line :pattern="pattern" :data="data2" :on-update:selected-keys="jump"
                :render-label="renderMethod" :node-props="setAttrs" :expanded-keys="expanded"
                :on-update:expanded-keys="expand" :key="update_tree" :filter="filter"
                :show-irrelevant-nodes="!store.hideUnsearched" :class="{ 'ellipsis': store.ellipsis }"
                :draggable="store.dragModify" @drop="onDrop" />
        </NConfigProvider>
    </div>
</template>

<script setup lang="ts">
import { ref, toRef, reactive, toRaw, computed, watch, nextTick, getCurrentInstance, onMounted, onUnmounted, HTMLAttributes, h, watchEffect } from 'vue';
import { Notice, MarkdownView, sanitizeHTMLToDom, HeadingCache, debounce } from 'obsidian';
import { NTree, TreeOption, NButton, NInput, NSlider, NConfigProvider, darkTheme, GlobalThemeOverrides, TreeDropInfo } from 'naive-ui';
import { Icon } from '@vicons/utils';
import { SettingsBackupRestoreRound } from '@vicons/material';
import { marked } from 'marked';

import { formula, internal_link, highlight, tag, remove_href, renderer } from './parser';
import { store } from './store';
import { QuietOutline } from "./plugin";

const lightThemeConfig = reactive<GlobalThemeOverrides>({
    common: {
        primaryColor: "",
        primaryColorHover: "",
    },
    Slider: {
        handleSize: "10px",
        fillColor: "",
        fillColorHover: "",
        dotBorderActive: ""
    },
});

const darkThemeConfig = reactive<GlobalThemeOverrides>({
    common: {
        primaryColor: "",
        primaryColorHover: "",
    },
    Slider: {
        handleSize: "10px",
        fillColor: "",
        fillColorHover: "",
        dotBorderActive: ""
    }
});

// toggle light/dark theme
let theme: any = computed(() => {
    if (store.dark) {
        return darkTheme;
    }
    return null;
});
let iconColor = computed(() => {
    if (store.dark) {
        return { color: "#a3a3a3" };
    }
    return { color: "#727272" };
});

function getDefaultColor() {
    let button = document.body.createEl("button", { cls: "mod-cta", attr: { style: "width: 0px; height: 0px;" } });
    let color = getComputedStyle(button, null).getPropertyValue("background-color");
    button.remove();
    return color;
}

watchEffect(() => {
    if (store.patchColor) {
        lightThemeConfig.common.primaryColor
            = lightThemeConfig.common.primaryColorHover
            = lightThemeConfig.Slider.fillColor
            = lightThemeConfig.Slider.fillColorHover
            = store.primaryColorLight;
        lightThemeConfig.Slider.dotBorderActive = `2px solid ${store.primaryColorLight}`;

        darkThemeConfig.common.primaryColor
            = darkThemeConfig.common.primaryColorHover
            = darkThemeConfig.Slider.fillColor
            = darkThemeConfig.Slider.fillColorHover
            = store.primaryColorDark;
        darkThemeConfig.Slider.dotBorderActive = `2px solid ${store.primaryColorDark}`;
        return;
    }
    // when css changed, recompute
    if (store.cssChange === store.cssChange) {
        let color = getDefaultColor();
        lightThemeConfig.common.primaryColor
            = lightThemeConfig.common.primaryColorHover
            = lightThemeConfig.Slider.fillColor
            = lightThemeConfig.Slider.fillColorHover
            = darkThemeConfig.common.primaryColor
            = darkThemeConfig.common.primaryColorHover
            = darkThemeConfig.Slider.fillColor
            = darkThemeConfig.Slider.fillColorHover
            = color;
        lightThemeConfig.Slider.dotBorderActive
            = darkThemeConfig.Slider.dotBorderActive
            = `2px solid ${color}`;

    }
});

let rainbowColor1 = ref("");
let rainbowColor2 = ref("");
let rainbowColor3 = ref("");
let rainbowColor4 = ref("");
let rainbowColor5 = ref("");

function hexToRGB(hex: string) {
    return `${parseInt(hex.slice(1, 3), 16)},`
        + `${parseInt(hex.slice(3, 5), 16)},`
        + `${parseInt(hex.slice(5, 7), 16)}`;
}

watchEffect(() => {
    if (store.rainbowLine) {
        rainbowColor1.value = `rgba(${hexToRGB(store.rainbowColor1)}, 0.6)`;
        rainbowColor2.value = `rgba(${hexToRGB(store.rainbowColor2)}, 0.6)`;
        rainbowColor3.value = `rgba(${hexToRGB(store.rainbowColor3)}, 0.6)`;
        rainbowColor4.value = `rgba(${hexToRGB(store.rainbowColor4)}, 0.6)`;
        rainbowColor5.value = `rgba(${hexToRGB(store.rainbowColor5)}, 0.6)`;
        return;
    }
    if (store.cssChange === store.cssChange) {
        rainbowColor1.value
            = rainbowColor2.value
            = rainbowColor3.value
            = rainbowColor4.value
            = rainbowColor5.value
            = "var(--nav-indentation-guide-color)";
    }
});

onMounted(() => {
    addEventListener("quiet-outline-reset", reset);
});
onUnmounted(() => {
    removeEventListener("quiet-outline-reset", reset);
});

let compomentSelf = getCurrentInstance();
let plugin = compomentSelf.appContext.config.globalProperties.plugin as QuietOutline;
let container = compomentSelf.appContext.config.globalProperties.container as HTMLElement;

// register scroll event
onMounted(() => {
    document.addEventListener("scroll", handleScroll, true);
});

onUnmounted(() => {
    document.removeEventListener("scroll", handleScroll, true);
});

let toKey = (h: HeadingCache, i: number) => "item-" + h.level + "-" + i;

let handleScroll = debounce(_handleScroll, 100);

function _handleScroll(evt: Event) {
    let target = evt.target as HTMLElement;
    if (!target.classList.contains("markdown-preview-view") && !target.classList.contains("cm-scroller")) {
        return;
    }
    // const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    const view = plugin.current_note;

    if (!view) return;

    let current_line = view.currentMode.getScroll() + 8;
    let current_heading = null;

    let i = store.headers.length;
    while (--i >= 0) {
        if (store.headers[i].position.start.line <= current_line) {
            current_heading = store.headers[i];
            break;
        }
    }
    if (!current_heading) {
        return;
    }

    let index = i;

    if (plugin.settings.auto_expand) {
        let should_expand = index < store.headers.length - 1 && store.headers[index].level < store.headers[index + 1].level
            ? [toKey(current_heading, index)]
            : [];

        let level = current_heading.level;
        while (i-- > 0) {
            if (store.headers[i].level < level) {
                should_expand.push(toKey(store.headers[i], i));
                level = store.headers[i].level;
            }
            if (level === 1) {
                break;
            }
        }
        expanded.value = should_expand;
    }
    let prevLocation = container.querySelector(".n-tree-node.located");
    if (prevLocation) {
        prevLocation.removeClass("located");
    }
    let curLocation = container.querySelector(`#no-${index}`);
    if (curLocation) {
        curLocation.addClass("located");
        curLocation.scrollIntoView({ block: "center", behavior: "smooth" });
    } else {
        setTimeout(() => {
            let curLocation = container.querySelector(`#no-${index}`);
            if (curLocation) {
                curLocation.addClass("located");
                curLocation.scrollIntoView({ block: "center", behavior: "smooth" });
            }
        }, 0);
    }
}


// add html attributes to nodes
interface HTMLAttr extends HTMLAttributes {
    "aria-label-position": "top" | "bottom" | "left" | "right";
}

const setAttrs = computed(() => {
    return (info: { option: TreeOption; }): HTMLAttr => {
        let lev = parseInt((info.option.key as string).split('-')[1]);
        let no = parseInt((info.option.key as string).split('-')[2]);

        return {
            class: `level-${lev}`,
            id: `no-${no}`,
            "aria-label": store.ellipsis ? info.option.label : "",
            "aria-label-position": store.labelDirection,
        };
    };
});


// switch heading expand levels
let level = ref(parseInt(plugin.settings.expand_level));
let expanded = ref<string[]>([]);
switchLevel(level.value);

function expand(keys: string[], option: TreeOption[]) {
    expanded.value = keys;
}

function switchLevel(lev: number) {
    expanded.value = store.headers
        .map((h, i) => {
            return "item-" + h.level + "-" + i;
        })
        .filter((key, i, arr) => {
            const get_level = (k: string): number => parseInt(k.split('-')[1]);
            if (i === arr.length - 1) return false;
            if (get_level(arr[i]) >= get_level(arr[i + 1])) return false;
            return get_level(key) <= lev;
        });
}

watch(
    level,
    (cur, prev) => {
        switchLevel(cur);
    }
);

// force remake tree
let update_tree = ref(0);

watch(
    () => store.leafChange,
    () => {
        const old_level = level.value;
        const old_pattern = pattern.value;

        pattern.value = "";
        level.value = parseInt(plugin.settings.expand_level);
        if (old_level === level.value) {
            switchLevel(level.value);
        }

        nextTick(() => {
            pattern.value = old_pattern;
        });

    }
);

const marks = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
};

function formatTooltip(value: number): string {
    let num = store.headers.filter((h) => h.level === value).length;

    if (value > 0) {
        return `H${value}: ${num}`;
    }
    return "No expand";
}


// load settings
let renderMethod = computed(() => {
    if (store.markdown) {
        return renderLabel;
    }
    return null;
});

// search
let pattern = ref("");

function regexFilter(pattern: string, option: TreeOption): boolean {
    let rule = /.*/;
    try {
        rule = RegExp(pattern, "i");
    } catch (e) {

    } finally {
        return rule.test(option.label);
    }
}

function simpleFilter(pattern: string, option: TreeOption): boolean {
    return option.label.toLowerCase().contains(pattern.toLowerCase());
}

let filter = computed(() => {
    return store.regexSearch ? regexFilter : simpleFilter;
});

let matchCount = computed(() => {
    return store.headers.filter((h) => {
        let node = { label: h.heading } as TreeOption;
        return filter.value(pattern.value, node);
    }).length;
});


// click and jump
async function jump(_selected: any, nodes: TreeOption[]): Promise<number> {
    if (nodes[0] === undefined) {
        return;
    }

    const key_value = (nodes[0].key as string).split("-");
    const key = parseInt(key_value[2]);
    let line: number = store.headers[key].position.start.line;

    // const view = store.plugin.app.workspace.getActiveViewOfType(MarkdownView)
    const view = plugin.current_note;
    if (view) {
        view.setEphemeralState({ line });
        setTimeout(() => { view.setEphemeralState({ line }); }, 100);
    }
}

// prepare data for tree component
let data2 = computed(() => {
    return makeTree(store.headers);
});

function makeTree(headers: HeadingCache[]): TreeOption[] {

    let tree: TreeOption[] = arrToTree(headers);
    return tree;
}

function arrToTree(headers: HeadingCache[]): TreeOption[] {
    const root: TreeOption = { children: [] };
    const stack = [{ node: root, level: -1 }];

    headers.forEach((h, i) => {
        let node: TreeOption = {
            label: h.heading,
            key: "item-" + h.level + "-" + i,
            line: h.position.start.line,
        };

        while (h.level <= stack.last().level) {
            stack.pop();
        }

        let parent = stack.last().node;
        if (parent.children === undefined) {
            parent.children = [];
        }
        parent.children.push(node);
        stack.push({ node, level: h.level });
    });

    return root.children;
}


// render markdown
marked.use({ extensions: [formula, internal_link, highlight, tag] });
marked.use({ walkTokens: remove_href });
marked.use({ renderer });

function renderLabel({ option }: { option: TreeOption; }) {
    let result = marked.parse(option.label).trim();

    // save mjx elements
    let i = 0;
    let mjxes = result.match(/<mjx-container.*?>.*?<\/mjx-container>/g);

    result = sanitizeHTMLToDom(`<div>${result}</div>`).children[0].innerHTML;

    // restore mjx elements
    result = result.replace(/<math.*?>.*?<\/math>/g, () => {
        return mjxes[i++];
    });

    return h("div", { innerHTML: result });
}

// reset button
function reset() {
    pattern.value = "";
    level.value = parseInt(plugin.settings.expand_level);
    switchLevel(level.value);
}

// drag and drop
async function onDrop({ node, dragNode, dropPosition }: TreeDropInfo) {
    // return;
    const file = plugin.app.workspace.getActiveFile();
    let lines = (await plugin.app.vault.read(file)).split("\n");
    let rawExpand = toRaw(expanded.value);

    const dragStart = getNo(dragNode);
    const dragEnd = dragStart + countTree(dragNode) - 1;
    let moveStart = 0, moveEnd = 0;
    switch (dropPosition) {
        case "inside": {
            node = node.children.last();
        }
        case "after": {
            if (dragStart > getNo(node) + countTree(node)) {
                moveStart = getNo(node) + countTree(node);
                moveEnd = dragStart - 1;
            } else {
                moveStart = dragEnd + 1;
                moveEnd = getNo(node) + countTree(node) - 1;
            }
            break;
        }
        case "before": {
            if (dragStart > getNo(node)) {
                moveStart = getNo(node);
                moveEnd = dragStart - 1;
            } else {
                moveStart = dragStart + countTree(dragNode);
                moveEnd = getNo(node) - 1;
            }
            break;
        }
    }
    const levDelta = getLevel(node) - getLevel(dragNode);
    changeExpandKey(rawExpand, dragStart, dragEnd, moveStart, moveEnd, levDelta);
    moveSection(
        lines,
        getLine(dragStart)[0],
        getLine(dragEnd)[1] || lines.length - 1,
        getLine(moveStart)[0],
        getLine(moveEnd)[1] || lines.length - 1,
        levDelta
    );

    plugin.app.vault.modify(file, lines.join("\n"));
}

function getLine(headNo: number) {
    return [
        store.headers[headNo].position.start.line,
        store.headers[headNo + 1]?.position.start.line - 1
    ];
}

// dls: drag lines start  mle: move lines end
function moveSection(lines: string[], dls: number, dle: number, mls: number, mle: number, delta: number) {
    let newPos = 0;
    if (dls < mls) {
        let moved = lines.splice(mls, mle - mls + 1);
        lines.splice(dls, 0, ...moved);
        newPos = dls + (mle - mls) + 1;
    } else {
        let moved = lines.splice(dls, dle - dls + 1);
        lines.splice(mls, 0, ...moved);
        newPos = mls;
    }
    for (let i = newPos; i <= newPos + (dle - dls); ++i) {
        if (lines[i].match(/^#+ /)) {
            delta > 0
                ? lines[i] = Array(delta).fill("#").join("") + lines[i]
                : lines[i] = lines[i].slice(-delta);
        }
    }
}

function changeExpandKey(expanded: string[], ds: number, de: number, ms: number, me: number, delta: number) {
    let dNewPos = 0, mNewPos = 0;
    if (ds < ms) {
        mNewPos = ds;
        dNewPos = ds + (me - ms) + 1;
    } else {
        dNewPos = ms;
        mNewPos = ms + (de - ds) + 1;
    }
    expanded.forEach((key, i) => {
        const no = getNo(key);
        if (ds <= no && no <= de) {
            expanded[i] = `item-${getLevel(key) + delta}-${dNewPos + (no - ds)}`;
        }
        if (ms <= no && no <= me) {
            expanded[i] = `item-${getLevel(key)}-${mNewPos + (no - ms)}`;
        }
    });
}

function getNo(node: TreeOption | string): number {
    if (typeof node !== "string") {
        node = node.key as string;
    }
    return parseInt(node.split("-")[2]);
}
function getLevel(node: TreeOption | string): number {
    if (typeof node !== "string") {
        node = node.key as string;
    }
    return parseInt(node.split("-")[1]);

}
function countTree(node: TreeOption): number {
    if (!node.children) return 1;

    return node.children.reduce((sum, n) => {
        return sum + countTree(n);
    }, 1);
}

</script>


<style>
/* ============ */
/*  彩虹大纲线   */
/* rainbow line */
/* ============ */
.quiet-outline .n-tree .n-tree-node-indent {
    content: "";
    height: unset;
    align-self: stretch;
}

.quiet-outline .level-2 .n-tree-node-indent,
.quiet-outline .level-3 .n-tree-node-indent:first-child,
.quiet-outline .level-4 .n-tree-node-indent:first-child,
.quiet-outline .level-5 .n-tree-node-indent:first-child,
.quiet-outline .level-6 .n-tree-node-indent:first-child {
    border-right: var(--nav-indentation-guide-width) solid v-bind(rainbowColor1);
    /* border-right: 2px solid rgb(253, 139, 31, 0.6); */
}

.quiet-outline .level-3 .n-tree-node-indent,
.quiet-outline .level-4 .n-tree-node-indent:nth-child(2),
.quiet-outline .level-5 .n-tree-node-indent:nth-child(2),
.quiet-outline .level-6 .n-tree-node-indent:nth-child(2) {
    border-right: var(--nav-indentation-guide-width) solid v-bind(rainbowColor2);
    /* border-right: 2px solid rgb(255, 223, 0, 0.6); */
}

.quiet-outline .level-4 .n-tree-node-indent,
.quiet-outline .level-5 .n-tree-node-indent:nth-child(3),
.quiet-outline .level-6 .n-tree-node-indent:nth-child(3) {
    border-right: var(--nav-indentation-guide-width) solid v-bind(rainbowColor3);
    /* border-right: 2px solid rgb(7, 235, 35, 0.6); */
}

.quiet-outline .level-5 .n-tree-node-indent,
.quiet-outline .level-6 .n-tree-node-indent:nth-child(4) {
    border-right: var(--nav-indentation-guide-width) solid v-bind(rainbowColor4);
    /* border-right: 2px solid rgb(45, 143, 240, 0.6); */
}

.quiet-outline .level-6 .n-tree-node-indent {
    border-right: var(--nav-indentation-guide-width) solid v-bind(rainbowColor5);
    /* border-right: 2px solid rgb(188, 1, 226, 0.6); */
}
</style>
