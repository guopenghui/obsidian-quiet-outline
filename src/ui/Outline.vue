<template>
    <div id="container" :style="containerStyle">
        <NConfigProvider
            :theme="theme"
            :theme-overrides="
                theme === null ? lightThemeConfig : darkThemeConfig
            "
        >
            <div class="function-bar" v-if="store.searchSupport">
                <NButton
                    size="small"
                    circle
                    @click="toBottom"
                    aria-label="To Bottom"
                >
                    <template #icon>
                        <Icon>
                            <ArrowCircleDownRound :style="iconColor" />
                        </Icon>
                    </template>
                </NButton>
                <NButton size="small" circle @click="reset" aria-label="Reset">
                    <template #icon>
                        <Icon>
                            <SettingsBackupRestoreRound :style="iconColor" />
                        </Icon>
                    </template>
                </NButton>
                <NInput
                    v-model:value="pattern"
                    placeholder="Input to search"
                    size="small"
                    clearable
                />
            </div>
            <NSlider
                v-if="store.levelSwitch"
                :value="level"
                :on-update:value="switchLevel"
                :marks="marks"
                step="mark"
                :min="0"
                :max="5"
                style="margin: 4px 0"
                :format-tooltip="formatTooltip"
            />
            <code v-if="pattern">{{ matchCount }} result(s): </code>
            <NTree
                block-line
                :pattern="pattern"
                :data="data2"
                :selected-keys="selectedKeys"
                :render-label="renderMethod"
                :render-prefix="renderPrefix"
                :node-props="nodeProps"
                :keyboard="false"
                :expanded-keys="expanded"
                :render-switcher-icon="renderSwitcherIcon"
                :on-update:expanded-keys="expand"
                :key="update_tree"
                :filter="filter"
                :show-irrelevant-nodes="!store.hideUnsearched"
                :class="{ ellipsis: store.ellipsis }"
                :draggable="store.dragModify && !editingHeadingText"
                @drop="onDrop"
                :allow-drop="() => plugin.navigator.canDrop"
            />
        </NConfigProvider>
    </div>
</template>

<script setup lang="ts">
import {
    ref,
    toRef,
    reactive,
    toRaw,
    computed,
    watch,
    nextTick,
    getCurrentInstance,
    onMounted,
    onUnmounted,
    HTMLAttributes,
    h,
    watchEffect,
    VNodeChild,
    inject,
} from "vue";

import {
    NTree,
    TreeOption,
    NButton,
    NInput,
    NSlider,
    NConfigProvider,
    darkTheme,
    GlobalThemeOverrides,
    TreeDropInfo,
} from "naive-ui";

import {
    SettingsBackupRestoreRound,
    ArrowCircleDownRound,
    ArrowForwardIosRound,
    LocalIcon,
} from "./icons";

import { Icon } from "@vicons/utils";

import { marked } from "marked";
import { Menu, sanitizeHTMLToDom } from "obsidian";

import {
    formula,
    internal_link,
    highlight,
    tag,
    remove_href,
    remove_ref,
    tokenizer,
} from "../parser";
import { store, SupportedIcon, Heading } from "@/store";
import type { QuietOutline } from "@/plugin";
import { useEvent } from "@/utils/use";
import { escapeHtml, getOrigin, htmlToText } from "@/utils/html"
import { setupMenu, normal, separator } from "@/utils/menu";
import { MarkdownStates, MD_DATA_FILE } from "@/navigators/markdown";
import { t } from "@/lang/helper";

type TreeOptionX = TreeOption & {
    no?: number;
    icon?: SupportedIcon;
    parent?: TreeOptionX;
    children?: TreeOptionX[];
};
type MakeRequired<T, K extends keyof T> = T & {
    [P in K]-?: T[P];
};

type ThemeOverrides = MakeRequired<
    GlobalThemeOverrides,
    "common" | "Slider" | "Tree"
>;

const lightThemeConfig = reactive<ThemeOverrides>({
    common: {
        primaryColor: "",
        primaryColorHover: "",
    },
    Slider: {
        handleSize: "10px",
        fillColor: "",
        fillColorHover: "",
        dotBorderActive: "",
    },
    Tree: {
        nodeTextColor: "var(--nav-item-color)",
    },
});

const darkThemeConfig = reactive<ThemeOverrides>({
    common: {
        primaryColor: "",
        primaryColorHover: "",
    },
    Slider: {
        handleSize: "10px",
        fillColor: "",
        fillColorHover: "",
        dotBorderActive: "",
    },
    Tree: {
        nodeTextColor: "var(--nav-item-color)",
    },
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
        return { color: "var(--icon-color)" };
    }
    return { color: "var(--icon-color)" };
});

function getDefaultColor() {
    let button = document.body.createEl("button", {
        cls: "mod-cta",
        attr: { style: "width: 0px; height: 0px;" },
    });
    let color = getComputedStyle(button, null).getPropertyValue(
        "background-color",
    );
    button.remove();
    return color;
}

let locatedColor = ref(getDefaultColor());

watchEffect(() => {
    if (store.patchColor) {
        lightThemeConfig.common.primaryColor =
            lightThemeConfig.common.primaryColorHover =
            // @ts-ignore type indication error
            lightThemeConfig.Slider.fillColor =
            // @ts-ignore type indication error
            lightThemeConfig.Slider.fillColorHover =
                store.primaryColorLight;
        // @ts-ignore type indication error
        lightThemeConfig.Slider.dotBorderActive = `2px solid ${store.primaryColorLight}`;

        darkThemeConfig.common.primaryColor =
            darkThemeConfig.common.primaryColorHover =
            // @ts-ignore type indication error
            darkThemeConfig.Slider.fillColor =
            // @ts-ignore type indication error
            darkThemeConfig.Slider.fillColorHover =
                store.primaryColorDark;
        // @ts-ignore type indication error
        darkThemeConfig.Slider.dotBorderActive = `2px solid ${store.primaryColorDark}`;
        return;
    }
    // when css changed, recompute
    if (store.cssChange === store.cssChange) {
        let color = getDefaultColor();
        lightThemeConfig.common.primaryColor =
            lightThemeConfig.common.primaryColorHover =
            // @ts-ignore type indication error
            lightThemeConfig.Slider.fillColor =
            // @ts-ignore type indication error
            lightThemeConfig.Slider.fillColorHover =
            darkThemeConfig.common.primaryColor =
            darkThemeConfig.common.primaryColorHover =
            // @ts-ignore type indication error
            darkThemeConfig.Slider.fillColor =
            // @ts-ignore type indication error
            darkThemeConfig.Slider.fillColorHover =
                color;
        // @ts-ignore type indication error
        lightThemeConfig.Slider.dotBorderActive =
            // @ts-ignore type indication error
            darkThemeConfig.Slider.dotBorderActive = `2px solid ${color}`;
        locatedColor.value = color;
    }
});

let rainbowColor1 = ref("");
let rainbowColor2 = ref("");
let rainbowColor3 = ref("");
let rainbowColor4 = ref("");
let rainbowColor5 = ref("");

function hexToRGB(hex: string) {
    return (
        `${parseInt(hex.slice(1, 3), 16)},` +
        `${parseInt(hex.slice(3, 5), 16)},` +
        `${parseInt(hex.slice(5, 7), 16)}`
    );
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
        rainbowColor1.value =
            rainbowColor2.value =
            rainbowColor3.value =
            rainbowColor4.value =
            rainbowColor5.value =
                "var(--nav-indentation-guide-color)";
    }
});

let biDi = ref("");
watchEffect(() => {
    biDi.value =
        store.textDirectionDecideBy === "text" ? "plaintext" : "isolate";
});

// New style settings
let containerStyle = computed(() => {
    const style: Record<string, string> = {};
    
    if (store.fontSize) {
        style['--custom-font-size'] = store.fontSize;
    }
    if (store.fontFamily) {
        style['--custom-font-family'] = store.fontFamily;
    }
    if (store.fontWeight) {
        style['--custom-font-weight'] = store.fontWeight;
    }
    if (store.lineHeight) {
        style['--custom-line-height'] = store.lineHeight;
    }
    if (store.lineGap) {
        style['--custom-line-gap'] = store.lineGap;
    }
    
    // Font color settings
    if (store.customFontColor) {
        if (store.h1Color) {
            style['--h1-color'] = store.h1Color;
        }
        if (store.h2Color) {
            style['--h2-color'] = store.h2Color;
        }
        if (store.h3Color) {
            style['--h3-color'] = store.h3Color;
        }
        if (store.h4Color) {
            style['--h4-color'] = store.h4Color;
        }
        if (store.h5Color) {
            style['--h5-color'] = store.h5Color;
        }
        if (store.h6Color) {
            style['--h6-color'] = store.h6Color;
        }
    }
    
    return style;
});

// switch icon
function renderSwitcherIcon() {
    return h(
        Icon,
        { size: "12px" },
        // null,
        {
            default: () => h(ArrowForwardIosRound),
        },
    );
}

// Prefix Icon
function renderPrefix({ option }: { option: TreeOptionX }): VNodeChild {
    if (!option.icon) return null;
    
    let iConChild: VNodeChild = null;
    switch (option.icon) {
        default: {
            iConChild = h(LocalIcon, { id: option.icon });
        }
    }
    return h(
        Icon,
        { size: "1.2em" },
        {
            default: () => iConChild,
        },
    );
}

const resetSelected = () => {
    selectedKeys.value = [];
};

onMounted(() => {
    addEventListener("quiet-outline-reset", reset);
    addEventListener("click", resetSelected);
});
onUnmounted(() => {
    removeEventListener("quiet-outline-reset", reset);
    removeEventListener("click", resetSelected);
});

// let compomentSelf = getCurrentInstance();
const plugin = inject("plugin") as QuietOutline;
const container = inject("container") as HTMLElement;
// let plugin = compomentSelf.appContext.config.globalProperties.plugin as QuietOutline;
// let container = compomentSelf.appContext.config.globalProperties.container as HTMLElement;

let toKey = (h: Heading, i: number) => "item-" + h.level + "-" + i;
let fromKey = (key: string) => parseInt((key as string).split("-")[2]);

function onPosChange(index: number) {
    autoExpand(index);
    resetLocated(index);
}

store.onPosChange = onPosChange;

function getDefaultLevel(): number {
    return plugin.navigator.getDefaultLevel();
}

function autoExpand(index: number) {
    if (plugin.settings.auto_expand_ext !== "disable") {
        let current_heading = store.headers[index];
        // if current heading is a parent, expand itself as well
        let should_expand =
            index < store.headers.length - 1 &&
            store.headers[index].level < store.headers[index + 1].level
                ? [toKey(current_heading, index)]
                : [];

        let curLevel = current_heading.level;
        let i = index;
        while (i-- > 0) {
            if (store.headers[i].level < curLevel) {
                should_expand.push(toKey(store.headers[i], i));
                curLevel = store.headers[i].level;
            }
            if (curLevel === 1) {
                break;
            }
        }

        if (
            plugin.settings.auto_expand_ext ===
            "expand-and-collapse-rest-to-setting"
        ) {
            expanded.value = filterKeysLessThanEqual(level.value);
        } else if (
            plugin.settings.auto_expand_ext ===
            "expand-and-collapse-rest-to-default"
        ) {
            const defaultLevel = getDefaultLevel();
            expanded.value = filterKeysLessThanEqual(defaultLevel);
            // expanded.value = filterKeysLessThanEqual(parseInt(plugin.settings.expand_level));
        }

        modifyExpandKeys(should_expand, "add");
    }
}

let locateIdx = ref(0);
function resetLocated(idx: number) {
    let path = getPathFromArr(idx);
    let index = path.find(
        (v) => !expanded.value.contains(toKey(store.headers[v], v)),
    );
    index = index === undefined ? path[path.length - 1] : index;

    locateIdx.value = index;

    setTimeout(() => {
        if (!plugin.settings.auto_scroll_into_view) return;
        let curLocation = container.querySelector(`#no-${index}`);
        if (curLocation) {
            curLocation.scrollIntoView({ block: "center", behavior: "smooth" });
        }
    }, 100);
}

let selectedKeys = ref<string[]>([]);

// add html attributes to nodes
interface HTMLAttr extends HTMLAttributes {
    "data-tooltip-position": "top" | "bottom" | "left" | "right";
    raw: string;
}

const nodeProps = computed(() => {
    return (info: { option: TreeOption }): HTMLAttr => {
        let lev = parseInt((info.option.key as string).split("-")[1]);
        let no = parseInt((info.option.key as string).split("-")[2]);
        let raw = info.option.label || "";

        let locate = locateIdx.value === no ? "located" : "";
        return {
            class: `level-${lev} ${locate}`,
            id: `no-${no}`,
            "aria-label": store.ellipsis ? info.option.label : "",
            "data-tooltip-position": store.labelDirection,
            raw,
            onClick: (event) => {
                if (
                    !(event.target as HTMLElement).matchParent(
                        ".n-tree-node-content",
                    )
                ) {
                    return;
                }
                jump(info.option);
            },
            onContextmenu(event: MouseEvent) {
                selectedKeys.value = [info.option.key as string];
                const { self, siblings, descendants } = getNode(fromKey(info.option.key as string));
                const menu = new Menu().setNoIcon();
                
                const subtreeKeys = [self, ...descendants].filter(node => node.children).map(node => node.key as string);
                const siblingKeys = siblings.filter(node => node.children).map(node => node.key as string);
                setupMenu(menu, [
                    expanded.value.includes(info.option.key as string)
                        ? normal(t("Collapse Recursively"), () => modifyExpandKeys(subtreeKeys, "remove"))
                        : normal(t("Expand Recursively"), () => modifyExpandKeys(subtreeKeys, "add")),
                    normal(t("Collapse Sibling"), () => modifyExpandKeys(siblingKeys, "remove")),
                    normal(t("Expand Sibling"), () => modifyExpandKeys(siblingKeys, "add")),
                    separator(),
                ]);
                
                plugin.navigator.onRightClick(
                    event,
                    {
                        node: info.option,
                        no,
                        level: lev,
                        raw,
                    },
                    menu,
                    () => {
                        selectedKeys.value = [];
                    },
                );
            },
        };
    };
});

// on Mouseover, show popover
let triggerNode: HTMLElement | undefined;
let mouseEvent: MouseEvent | undefined;
let prevShowed = "";

function onMouseEnter(event: MouseEvent) {
    let target = event.target as HTMLElement;

    let node = target.closest(".n-tree-node") as HTMLElement;
    if (!node) {
        return;
    }
    triggerNode = node;
    mouseEvent = event;
    addEventListener("keydown", openPopover);
}

function onMouseLeave(event: MouseEvent) {
    removeEventListener("keydown", openPopover);
}

const funcKeyPressed = (event: KeyboardEvent): boolean => {
    return (
        (plugin.settings.show_popover_key === "ctrlKey" && event.ctrlKey) ||
        (plugin.settings.show_popover_key === "altKey" && event.altKey) ||
        (plugin.settings.show_popover_key === "metaKey" && event.metaKey)
    );
};

function _openPopover(e: KeyboardEvent) {
    if (funcKeyPressed(e)) {
        plugin.app.workspace.trigger("hover-link", {
            event: mouseEvent,
            source: "preview",
            targetEl: triggerNode,
            hoverParent: { hoverPopover: null },
            linktext: "#" + triggerNode?.getAttribute("raw"),
            sourcePath: plugin.navigator.getPath(),
        });
    }
}

const openPopover = customDebounce(_openPopover, 100);

// excute on first time, and wait until next fresh
// ... or take a break when node pointed changes
function customDebounce(func: (_: any) => void, delay: number) {
    let fresh = true;
    let timeoutId: any;

    return function (...args: any) {
        const context = this;
        let currentLink = triggerNode?.getAttribute("raw") || "";
        if (currentLink !== prevShowed || fresh) {
            func.apply(context, args);

            fresh = false;
            prevShowed = currentLink;
            return;
        }

        // 如果已经设置了定时器，清除之前的定时器
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // 设置新的定时器
        timeoutId = setTimeout(() => {
            fresh = true;
        }, delay);
    };
}

onMounted(() => {
    container.addEventListener("mouseover", onMouseEnter);
    container.addEventListener("mouseout", onMouseLeave);
});

onUnmounted(() => {
    container.removeEventListener("mouseover", onMouseEnter);
    container.removeEventListener("mouseout", onMouseLeave);
    removeEventListener("keydown", openPopover);
});

// switch heading expand levels
// let level = ref(parseInt(plugin.settings.expand_level));
let level = ref(getDefaultLevel());
let expanded = ref<string[]>([]);
switchLevel(level.value);

function modifyExpandKeys(
    newKeys: string[],
    mode: "add" | "remove" | "replace" = "replace",
) {
    if (mode === "replace") {
        expanded.value = newKeys;
    } else if(mode === "remove") {
        expanded.value = expanded.value.filter(key => !newKeys.includes(key));
    } else {
        const mergeSet = new Set([...expanded.value, ...newKeys]);
        expanded.value = [...mergeSet];
    }
    syncExpandKeys();
}

function syncExpandKeys() {
    const path = plugin.navigator.getPath();
    if (!path) return;
    
    const keys = toRaw(expanded.value)
    plugin.navigator.onExpandKeysChange(path, keys);
    plugin.heading_states[path] = keys;
}

function expand(keys: string[], option: TreeOption[]) {
    modifyExpandKeys(keys);
}

function switchLevel(lev: number) {
    level.value = lev;

    const newKeys = filterKeysLessThanEqual(lev);
    modifyExpandKeys(newKeys);
}

useEvent(window, "quiet-outline-levelchange", (e) => {
    if (typeof e.detail.level === "number") {
        switchLevel(e.detail.level);
    } else if (e.detail.level === "inc") {
        switchLevel(Math.clamp(level.value + 1, 0, 5));
    } else if (e.detail.level === "dec") {
        switchLevel(Math.clamp(level.value - 1, 0, 5));
    }
});

function filterKeysLessThanEqual(lev: number): string[] {
    const newKeys = store.headers
        .map((h, i) => {
            return { level: h.level, no: i };
        })
        .filter((_, i, arr) => {
            // leaf heading cannot be expanded
            if (i === arr.length - 1 || arr[i].level >= arr[i + 1].level) {
                return false;
            }
            return arr[i].level <= lev;
        })
        .map((h) => {
            return "item-" + h.level + "-" + h.no;
        });

    return newKeys;
}

function offset(key: string, offset: number) {
    const parts = key.split("-");
    return `item-${parts[1]}-${parseInt(parts[2]) + offset}`;
}
// calculate expanded keys using diff
watch(
    () => toRaw(store.modifyKeys),
    ({ offsetModifies, removes, adds, modifies }) => {
        // 1. remove deleted headings
        // 2. remove headings which are not parent anymore (remove some '#')
        // 3. transform index according adding and removing situations
        // 4. transform key's level for those headings which changed its level (remove some '#'), but is still a parent
        const newExpandKeys = expanded.value
            .filter((key) => {
                const index = fromKey(key);
                const notRemove = !removes.some(
                    (remove) =>
                        remove.begin <= index &&
                        index < remove.begin + remove.length,
                );
                const notParent2Child = !modifies.some(
                    (modify) =>
                        modify.oldBegin === index &&
                        modify.levelChangeType === "parent2child",
                );
                return notRemove && notParent2Child;
            })
            .map((key) => {
                const index = fromKey(key);
                const Parent2Parent = modifies.find(
                    (modify) => modify.oldBegin === index,
                );
                const offsetBase = offsetModifies.findLastIndex(
                    (modify) => modify.begin <= index,
                );
                let newKey =
                    offsetBase === -1
                        ? key
                        : offset(key, offsetModifies[offsetBase].offset);

                let newIndex = fromKey(newKey);
                if (Parent2Parent) {
                    return `item-${store.headers[Parent2Parent.newBegin].level}-${newIndex}`;
                } else {
                    return newKey;
                }
            });

        // for those headings which changed its level to become a parent, add its key to expanded array
        modifies
            .filter((modify) => modify.levelChangeType === "child2parent")
            .forEach((modify) => {
                newExpandKeys.push(
                    `item-${store.headers[modify.newBegin].level}-${modify.newBegin}`,
                );
            });

        // make the added's parent headings expand
        adds.forEach((add) => {
            const path = getPathFromArr(add.begin);
            if (
                add.begin >= store.headers.length - 1 ||
                store.headers[add.begin].level >=
                    store.headers[add.begin + 1].level
            ) {
                path.pop(); // remove itself
            }
            path.forEach((index) => {
                newExpandKeys.push(
                    `item-${store.headers[index].level}-${index}`,
                );
            });
        });
        modifyExpandKeys([...new Set(newExpandKeys)]);
    },
);

// force remake tree
let update_tree = ref(0);

watch(
    () => store.leafChange,
    () => {
        const old_pattern = pattern.value;

        pattern.value = "";
        level.value = getDefaultLevel();

        const dataMap = plugin.data_manager.getData<MarkdownStates>(MD_DATA_FILE);
        const old_state = plugin.navigator.getId() === "markdown"
            ? dataMap?.[plugin.navigator.getPath()]?.expandedKeys
            : null;
        if (plugin.settings.persist_md_states && old_state) {
            modifyExpandKeys(old_state);
        } else {
            switchLevel(level.value);
        }

        if (plugin.settings.keep_search_input) {
            nextTick(() => {
                pattern.value = old_pattern;
            });
        }
    },
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

type RenderMethodType = ({option}: {option: TreeOptionX}) => ReturnType<typeof h>;
let editingHeadingText = ref<string|undefined>();
let renderMethod = computed<RenderMethodType>(() => {
    let renderer: RenderMethodType = store.markdown
        ? renderLabel
        : ({option}) => h("div", option.label);
    
    const method: RenderMethodType = ({option}) => {
        if (option.key !== store.currentEditingKey) {
            return renderer({option});
        }
        
        if (editingHeadingText.value === undefined) {
            editingHeadingText.value = option.label!;
        }
        
        return h(NInput, {
            value: editingHeadingText.value,
            onUpdateValue: (value) => {
                editingHeadingText.value = value;
            },
            onClick(e) {
                e.stopPropagation();
            },
            onKeydown(e) {
                if (e.key === "Enter") {
                    plugin.navigator.changeContent(option.no!, editingHeadingText.value || "");
                    // store.headers[option.no!].heading = newContent.value || "";
                    store.currentEditingKey = "";
                    editingHeadingText.value = undefined;
                } else if(e.key === "Escape") {
                    store.currentEditingKey = "";
                    editingHeadingText.value = undefined;
                }
            },
        });
    };
    return method;
});

// search
let pattern = ref("");

function regexFilter(pattern: string, option: TreeOption): boolean {
    let rule = /.*/;
    try {
        rule = RegExp(pattern, "i");
    } catch (e) {
    } finally {
        return rule.test(mdToHtmlTextContent(option.label));
    }
}

function simpleFilter(pattern: string, option: TreeOption): boolean {
    return mdToHtmlTextContent(option.label).toLowerCase()
        .contains(pattern.toLowerCase());
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
async function jump(node: TreeOption): Promise<void> {
    // if (nodes[0] === undefined) {
    //     return;
    // }

    const key_value = (node.key as string).split("-");
    const key = parseInt(key_value[2]);
    plugin.navigator.jumpWhenClick(key);
}

// prepare data for tree component
let data2 = computed(() => {
    return makeTree(store.headers);
});

function makeTree(headers: Heading[]): TreeOptionX[] {
    let tree: TreeOptionX[] = arrToTree(headers);
    return tree;
}

function arrToTree(headers: Heading[]): TreeOptionX[] {
    const root: TreeOptionX = { children: [] };
    const stack = [{ node: root, level: -1 }];

    headers.forEach((h, i) => {
        let node: TreeOptionX = {
            label: h.heading,
            key: "item-" + h.level + "-" + i,
            line: h.position.start.line,
            icon: h.icon,
            no: i
        };

        while (h.level <= stack.last()!.level) {
            stack.pop();
        }

        let parent = stack.last()!.node;
        if (parent.children === undefined) {
            parent.children = [];
        }
        node.parent = parent;
        parent.children.push(node);
        stack.push({ node, level: h.level });
    });

    root.children?.forEach(c => c.parent = undefined);
    return root.children!;
}

// get associated heading indexes of a given heading
function getNode(index: number): {
    self: TreeOptionX,
    path: TreeOptionX[],
    siblings: TreeOptionX[],
    descendants: TreeOptionX[]
} {
    let path: TreeOptionX[] = [];
    function pushLastGreatEq(nodes: TreeOption[] | undefined) {
        if (!nodes || nodes.length === 0) {
            return;
        }
        let idx = 0;
        for (let i = nodes.length - 1; i >= 0; i--) {
            let pos = fromKey(nodes[i].key as string);
            if (pos <= index) {
                path.push(nodes[i]);
                idx = i;
                break;
            }
        }
        pushLastGreatEq(nodes[idx].children);
    }
    pushLastGreatEq(data2.value);
    
    const self = path[path.length - 1];
    const siblings = path[path.length - 2]
        ? path[path.length - 2].children || []
        : data2.value;
    
    const descendants: TreeOptionX[] = [];
    function traverse(nodes: TreeOption[] | undefined) {
        if (!nodes || nodes.length === 0) {
            return;
        }
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            descendants.push(node);
            traverse(node.children);
        }
    }
    traverse(self.children);
    
    return {
        self,
        path,
        siblings,
        descendants,
    };
}
// calculate path of heading by store.header array
function getPathFromArr(index: number) {
    let res: number[] = [];
    let curLevel = store.headers[index].level + 1;
    for (let i = index; i >= 0; i--) {
        if (store.headers[i].level < curLevel) {
            res.push(i);
            curLevel--;
        }
    }
    return res.reverse();
}

// render markdown
marked.use({
    extensions: [formula, internal_link, highlight, tag, remove_ref],
});
marked.use({ walkTokens: remove_href });
marked.use({ tokenizer });

/** 
 * Convert markdown to HTML text content.
 * 
 * (**NO SANITIZED!!!** for performance)
 * @param text - The markdown text to convert.
 * @param keepRawFormula - Whether to keep raw formula in the output.
 * @returns The textContent (**no sanitized!!!**)
 */
function mdToHtmlTextContent(text: string | undefined, keepRawFormula: boolean = false) {
    let result = marked.parse(text || "").trim();

    // save mjx elements
    let i = 0;
    let mjxes: string[] = result.match(/<mjx-container.*?>.*?<\/mjx-container>/g) || [];
    
    // map to original formula text
    mjxes = mjxes.map(mjx => escapeHtml(getOrigin(mjx)));
    
    result = result.replace(/<mjx-container.*?>.*?<\/mjx-container>/g, () => {
        return `<math></math>`;
    });

    // restore mjx elements
    result = result.replace(/<math.*?>.*?<\/math>/g, () => {
        return mjxes[i++];
    });
    
    return htmlToText(result)
}

/** **SANITIZED** html string */
function mdToHtml(label: string | undefined) {
    let result = marked.parse(label || "").trim();

    // save mjx elements
    let i = 0;
    let mjxes: string[] = result.match(/<mjx-container.*?>.*?<\/mjx-container>/g) || [];
    
    result = result.replace(/<mjx-container.*?>.*?<\/mjx-container>/g, () => {
        return `<math></math>`;
    });

    result = sanitizeHTMLToDom(`<div>${result}</div>`).children[0].innerHTML;

    // restore mjx elements
    result = result.replace(/<math.*?>.*?<\/math>/g, () => {
        return mjxes[i++];
    });
    
    return result;
}

function renderLabel({ option }: { option: TreeOption }) {
    const result = mdToHtml(option.label);
    return h("div", { innerHTML: result });
}
// to-bottom button
async function toBottom() {
    plugin.navigator.toBottom();
}
// reset button
function reset() {
    pattern.value = "";
    level.value = getDefaultLevel();
    switchLevel(level.value);
}

onMounted(() => {
    container.addEventListener("dragstart", (e) => {
        if (!plugin.navigator.canDrop) {
            return;
        }

        const target = e.target as HTMLElement;
        if (!target || !target.hasClass("n-tree-node")) {
            return;
        }

        const no = parseInt(target.id.slice(3));
        const heading = store.headers[no];

        e.dataTransfer?.setData("text/plain", heading.heading);
        // @ts-ignore
        plugin.app.dragManager.onDragStart(e, {
            source: "outline",
            type: "heading",
            icon: "heading-glyph",
            title: heading.heading,
            heading,
            // @ts-ignore
            // currently only markdownNav allows drop, and its view exists
            file: plugin.navigator.view.file,
        });
    });
});

// drag and drop
async function onDrop({ node, dragNode, dropPosition }: TreeDropInfo) {
    if (!plugin.navigator.canDrop) {
        return;
    }

    const fromNo = getNo(dragNode);
    const toNo = getNo(node);

    await plugin.navigator.handleDrop(fromNo, toNo, dropPosition);
}

function getNo(node: TreeOption | string): number {
    if (typeof node !== "string") {
        node = node.key as string;
    }
    return parseInt(node.split("-")[2]);
}

function idxToKey(idx: number) {
    return toKey(store.headers[idx], idx)
}

function isLeaf(idx: number) {
    return idx === store.headers.length - 1
        || store.headers[idx + 1].level <= store.headers[idx].level;
}

function selectVisible() {
    const path = getPathFromArr(locateIdx.value);
    const firstCollapse = path.findIndex(item => !expanded.value.contains(idxToKey(item)));
    const visibleOne = firstCollapse === -1 ? locateIdx.value : path[firstCollapse];
    
    selectedKeys.value = [idxToKey(visibleOne)];
}

function setExpand(open: boolean) {
    const selectedKey = selectedKeys.value[0];
    if (!selectedKey || isLeaf(getNo(selectedKey))) return;
    
    
    if(open) {
        modifyExpandKeys([selectedKey], "add");
    }else {
        modifyExpandKeys([selectedKey], "remove");
    }
}

function center() {
    const selectedKey = selectedKeys.value[0];
    if (!selectedKey) return;
    
    const no = getNo(selectedKey);
    const currentNode = container.querySelector(`.n-tree .n-tree-node-wrapper:has(#no-${no})`)
    currentNode?.scrollIntoView({behavior: "smooth", block: "center"});
    
}

function move(direction: "up" | "down" | "bottom" | "top") {
    const selectedKey = selectedKeys.value[0];
    if (!selectedKey) return;
    
    const no = getNo(selectedKey);
    const currentNode = container.querySelector(`.n-tree .n-tree-node-wrapper:has(#no-${no})`)
    if(!currentNode) {
        const nextNode = container.querySelector(`.n-tree .n-tree-node-wrapper`)?.firstElementChild;
        if (!nextNode) return;
        
        moveToHeadingEl(nextNode as HTMLElement);
        return;
    }
    
    if(direction === "up") {
        const prevNode = currentNode.previousSibling?.firstChild as HTMLElement;
        if(prevNode) {
            moveToHeadingEl(prevNode);
        }
    }else if(direction === "down") {
        const nextNode = currentNode.nextSibling?.firstChild as HTMLElement;
        if(nextNode) {
            moveToHeadingEl(nextNode);
        }
    } else if(direction === "bottom") {
        const bottomNode = currentNode.parentElement?.lastElementChild?.firstElementChild as HTMLElement;
        if(bottomNode) {
            moveToHeadingEl(bottomNode);
        }
    } else if(direction === "top") {
        const topNode = currentNode.parentElement?.firstElementChild?.firstElementChild as HTMLElement;
        if(topNode) {
            moveToHeadingEl(topNode);
        }
    }
}

function moveToHeadingEl(el: HTMLElement) {
    // when expanding a heading, there is an intermediate state
    const match = el.id.match(/no-(\d+)/);
    if (!match) return;
    
    const no = parseInt(match[1]);
    selectedKeys.value = [idxToKey(no)];
    el.scrollIntoView({behavior: "smooth", block: "nearest"});
}

function resetPattern() {
    pattern.value = "";
}

function currentSelected() {
    const selectedKey = selectedKeys.value[0];
    if (!selectedKey) return;
    
    return getNo(selectedKey);
}

defineExpose({
   setExpand,
   center,
   move,
   selectVisible,
   resetPattern,
   currentSelected,
})

</script>

<style>
.quiet-outline .n-tree {
    padding-top: 5px;
}

/* ============ */
/*  彩虹大纲线   */
/* rainbow line */
/* ============ */
.quiet-outline .n-tree .n-tree-node-indent {
    content: "";
    height: unset;
    align-self: stretch;
}

/* RTL language support */
.quiet-outline .n-tree .n-tree-node-content :is(p, h1, h2, h3, h4, h5) {
    unicode-bidi: v-bind(biDi);
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

/* located heading*/
.n-tree-node.located p {
    color: v-bind("locatedColor");
}

/* adjust indent */

/* .quiet-outline .n-tree .n-tree-node .n-tree-node-content {
    padding-left: 0;
} */
.quiet-outline
    .n-tree
    .n-tree-node
    .n-tree-node-content
    .n-tree-node-content__prefix {
    margin-right: 0;
}
.quiet-outline
    .n-tree
    .n-tree-node
    .n-tree-node-content
    .n-tree-node-content__prefix
    > *:last-child {
    margin-right: 8px;
}
.n-tree-node-switcher__icon {
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
