<template>
    <div id="container" :style="containerStyle">
        <NConfigProvider :theme="theme" :theme-overrides="theme === null ? lightThemeConfig : darkThemeConfig">
            <div class="function-bar" v-if="store.searchSupport">
                <NButton size="small" circle @click="toBottom" aria-label="To Bottom">
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
                <NInput v-model:value="pattern" placeholder="Input to search" size="small" clearable />
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
                :data="data"
                :selected-keys="selectedKeys"
                :render-label="renderLabel"
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
import { ref, watch, nextTick, inject } from "vue";
import { NTree, TreeOption, NButton, NInput, NSlider, NConfigProvider } from "naive-ui";

import { Icon } from "@vicons/utils";
import { store } from "@/store";
import type { QuietOutline } from "@/plugin";
import { useEvent } from "@/utils/use";
import { MarkdownStates, MD_DATA_FILE } from "@/navigators/markdown";
import { SettingsBackupRestoreRound, ArrowCircleDownRound } from "./icons";
import { useOutlineTree } from "./use-tree";
import { useOutlineRenderer } from "./use-heading-renderer";
import { useOutlinePopover } from "./use-popover";
import { useOutlineTheme } from "./use-theme";
import { useOutlineDnd } from "./use-dnd";
import { useOutlineSearch } from "./use-search";
import { useOutlineExpand } from "./use-expand";
import { useOutlineController } from "./use-controller";

const plugin = inject("plugin") as QuietOutline;
const container = inject("container") as HTMLElement;

// level switch
const marks = { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "" };
function formatTooltip(value: number): string {
    let num = store.headers.filter((h) => h.level === value).length;

    if (value > 0) {
        return `H${value}: ${num}`;
    }
    return "No expand";
}

const {
    theme,
    lightThemeConfig,
    darkThemeConfig,
    iconColor,
    locatedColor,
    rainbowColor1,
    rainbowColor2,
    rainbowColor3,
    rainbowColor4,
    rainbowColor5,
    containerStyle,
    biDi,
} = useOutlineTheme();
const { level, switchLevel, expanded, modifyExpandKeys, getDefaultLevel, autoExpand } = useOutlineExpand(plugin);
const { data, nodeProps, locateIdx, resetLocated, selectedKeys } = useOutlineTree({
    plugin,
    container,
    level,
    expanded,
    modifyExpandKeys,
});

const { pattern, filter, matchCount } = useOutlineSearch();
const { onDrop } = useOutlineDnd(container, plugin);
const { renderLabel, renderPrefix, renderSwitcherIcon, editingHeadingText } = useOutlineRenderer(plugin);
useOutlinePopover(plugin, container);

// to-bottom button
async function toBottom() {
    plugin.navigator.toBottom();
}
// reset button
function reset() {
    pattern.value = "";
    switchLevel(getDefaultLevel());
}

function resetSelected() {
    selectedKeys.value = [];
}

function expand(keys: string[], option: TreeOption[]) {
    modifyExpandKeys(keys);
}

function onPosChange(index: number) {
    autoExpand(index);
    resetLocated(index);
}

store.onPosChange = onPosChange;

// react to some events
useEvent(window, "quiet-outline-reset" as any, reset);
useEvent(window, "click", resetSelected);
useEvent(window, "quiet-outline-levelchange", (e) => {
    if (typeof e.detail.level === "number") {
        switchLevel(e.detail.level);
    } else if (e.detail.level === "inc") {
        switchLevel(Math.clamp(level.value + 1, 0, 5));
    } else if (e.detail.level === "dec") {
        switchLevel(Math.clamp(level.value - 1, 0, 5));
    }
});

// force remake tree
let update_tree = ref(0);

// when switching between views
watch(
    () => store.leafChange,
    () => {
        const old_pattern = pattern.value;

        // reset level and searching pattern
        pattern.value = "";
        level.value = getDefaultLevel();

        // try to restore expanding state
        const dataMap = plugin.data_manager.getData<MarkdownStates>(MD_DATA_FILE);
        const old_state =
            plugin.navigator.getId() === "markdown" ? dataMap?.[plugin.navigator.getPath()]?.expandedKeys : null;
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
    {
        immediate: true,
    },
);

const { selectVisible, setExpand, center, move, resetPattern, currentSelected } = useOutlineController({
    container,
    locateIdx,
    selectedKeys,
    expanded,
    modifyExpandKeys,
    pattern,
});

defineExpose({
    setExpand,
    center,
    move,
    selectVisible,
    resetPattern,
    currentSelected,
});
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
.quiet-outline .n-tree .n-tree-node .n-tree-node-content .n-tree-node-content__prefix {
    margin-right: 0;
}
.quiet-outline .n-tree .n-tree-node .n-tree-node-content .n-tree-node-content__prefix > *:last-child {
    margin-right: 8px;
}
.n-tree-node-switcher__icon {
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
