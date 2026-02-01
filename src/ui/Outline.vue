<template>
    <NConfigProvider :theme="theme" :theme-overrides="themeOverrides" :style="containerStyle">
        <div class="function-bar" v-if="store.searchSupport">
            <QButton @click="toBottom" :icon-style="iconColor" :svg-icon="ArrowCircleDownRound" label="To Bottom" />
            <QButton @click="reset" :icon-style="iconColor" :svg-icon="SettingsBackupRestoreRound" label="Reset" />
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
            ref="tree"
            block-line
            :indent="17"
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
            :key="keyOfTree"
            :filter="filter"
            :show-irrelevant-nodes="!store.hideUnsearched"
            :class="{ ellipsis: store.ellipsis }"
            :draggable="store.dragModify && !editingHeadingText"
            @drop="onDrop"
            :allow-drop="() => plugin.navigator.canDrop"
        />
    </NConfigProvider>
</template>

<script setup lang="ts">
import { ref, nextTick, inject } from "vue";
import { NTree, NInput, NSlider, NConfigProvider } from "naive-ui";

import { store } from "@/store";
import type QuietOutline from "@/plugin";
import { useEventBus } from "@/utils/use";
import { type MarkdownStates, MD_DATA_FILE } from "@/navigators/markdown";
import { SettingsBackupRestoreRound, ArrowCircleDownRound } from "./icons";
import QButton from "./Button.vue";
import { useOutlineTree } from "./use-tree";
import { useOutlineRenderer } from "./use-heading-renderer";
import { useOutlinePopover } from "./use-popover";
import { useOutlineTheme } from "./use-theme";
import { useOutlineDnd } from "./use-dnd";
import { useOutlineSearch } from "./use-search";
import { useOutlineExpand } from "./use-expand";
import { useOutlineController } from "./use-controller";

const plugin = inject<QuietOutline>("plugin")!;
const container = inject<HTMLElement>("container")!;
const tree = ref<InstanceType<typeof NTree>>();

// level switch
const marks = { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "" };
function formatTooltip(value: number): string {
    const num = store.headers.filter((h) => h.level === value).length;

    if (value > 0) {
        return `H${value}: ${num}`;
    }
    return "No expand";
}

const { theme, themeOverrides, iconColor, primaryColor, rainbowColors, containerStyle, biDi } = useOutlineTheme();
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
useEventBus("reset-panel", reset);

function expand(keys: string[]) {
    modifyExpandKeys(keys);
}

// force remake tree
const keyOfTree = ref(0);
function forceRemakeTree() {
    keyOfTree.value++;
}

function onPosChange(index: number) {
    autoExpand(index);
    resetLocated(index);
}

function onLeafChange() {
    // force reset animation-in-progress state of naive-ui tree component
    tree.value?.handleAfterEnter();

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
}
onLeafChange();

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
    onPosChange,
    onLeafChange,
    forceRemakeTree,
});
</script>

<style>
.quiet-outline .n-tree {
    padding-top: 5px;
}

/* RTL language support */
.quiet-outline .n-tree .n-tree-node-content :is(p, h1, h2, h3, h4, h5) {
    unicode-bidi: v-bind(biDi);
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
.quiet-outline .n-tree-node-indent {
    position: relative;
}
.quiet-outline .n-tree-node-indent::after {
    content: "";
    position: absolute;
    height: 100%;
    right: 8px;
}

:is(
    .quiet-outline .level-2 .n-tree-node-indent:first-child,
    .quiet-outline .level-3 .n-tree-node-indent:first-child,
    .quiet-outline .level-4 .n-tree-node-indent:first-child,
    .quiet-outline .level-5 .n-tree-node-indent:first-child,
    .quiet-outline .level-6 .n-tree-node-indent:first-child
)::after {
    border-right: var(--nav-indentation-guide-width) solid v-bind("rainbowColors.h1");
    /* border-right: 2px solid rgb(253, 139, 31, 0.6); */
}

:is(
    .quiet-outline .level-3 .n-tree-node-indent:nth-child(2),
    .quiet-outline .level-4 .n-tree-node-indent:nth-child(2),
    .quiet-outline .level-5 .n-tree-node-indent:nth-child(2),
    .quiet-outline .level-6 .n-tree-node-indent:nth-child(2)
)::after {
    border-right: var(--nav-indentation-guide-width) solid v-bind("rainbowColors.h2");
    /* border-right: 2px solid rgb(255, 223, 0, 0.6); */
}

:is(
    .quiet-outline .level-4 .n-tree-node-indent:nth-child(3),
    .quiet-outline .level-5 .n-tree-node-indent:nth-child(3),
    .quiet-outline .level-6 .n-tree-node-indent:nth-child(3)
)::after {
    border-right: var(--nav-indentation-guide-width) solid v-bind("rainbowColors.h3");
    /* border-right: 2px solid rgb(7, 235, 35, 0.6); */
}

:is(
    .quiet-outline .level-5 .n-tree-node-indent:nth-child(4),
    .quiet-outline .level-6 .n-tree-node-indent:nth-child(4)
)::after {
    border-right: var(--nav-indentation-guide-width) solid v-bind("rainbowColors.h4");
    /* border-right: 2px solid rgb(45, 143, 240, 0.6); */
}

.quiet-outline .level-6 .n-tree-node-indent:nth-child(5)::after {
    border-right: var(--nav-indentation-guide-width) solid v-bind("rainbowColors.h5");
    /* border-right: 2px solid rgb(188, 1, 226, 0.6); */
}

/* located heading*/
.n-tree-node.located p {
    color: v-bind(primaryColor);
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
