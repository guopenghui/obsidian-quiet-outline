<template>
    <div id="container">
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
            <NSlider v-if="store.levelSwitch" :value="level" :on-update:value="switchLevel" :marks="marks" step="mark" :min="0" :max="5"
                style="margin:4px 0;" :format-tooltip="formatTooltip" />
            <code v-if="pattern">{{ matchCount }} result(s): </code>
            <NTree block-line :pattern="pattern" :data="data2" :on-update:selected-keys="jump"
                :render-label="renderMethod" :render-prefix="renderPrefix" :node-props="setAttrs"
                :expanded-keys="expanded" :render-switcher-icon="renderSwitcherIcon"
                :on-update:expanded-keys="expand" :key="update_tree" :filter="filter"
                :show-irrelevant-nodes="!store.hideUnsearched" :class="{ 'ellipsis': store.ellipsis }"
                :draggable="store.dragModify" @drop="onDrop" :allow-drop="() => true" />
        </NConfigProvider>
    </div>
</template>

<script setup lang="ts">
import { 
	ref, toRef, reactive, toRaw, computed, watch, nextTick, getCurrentInstance,
	onMounted, onUnmounted, HTMLAttributes, h, watchEffect, VNodeChild
} from 'vue';

import { 
	NTree, TreeOption, NButton, NInput, NSlider, NConfigProvider,
	darkTheme, GlobalThemeOverrides, TreeDropInfo
} from 'naive-ui';

import { 
    SettingsBackupRestoreRound, ArrowCircleDownRound, ArticleOutlined,
    AudiotrackOutlined, CategoryOutlined, ImageOutlined, PublicOutlined,
    TextFieldsOutlined, FilePresentOutlined, ArrowForwardIosRound, OndemandVideoOutlined,
} from '@vicons/material';

import { Icon } from '@vicons/utils';

import { marked } from 'marked';
import { MarkdownView, sanitizeHTMLToDom, debounce, FileView, MarkdownPreviewSection} from 'obsidian';
import { EditorView } from "@codemirror/view";

import { formula, internal_link, highlight, tag, remove_href, renderer, remove_ref, nolist } from './parser';
import { store, SupportedIcon, Heading } from './store';
import { QuietOutline, setEphemeralState } from "./plugin";
import { useEvent } from "./utils/use"
import {parseMarkdown, stringifySection, moveHeading, visitSection} from "./utils/md-process"

type TreeOptionX = TreeOption & {
    icon?: SupportedIcon,
}

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
    Tree: {
        nodeTextColor: "var(--nav-item-color)",
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
    },
    Tree: {
        nodeTextColor: "var(--nav-item-color)",
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
        return { color: "var(--icon-color)" };
    }
    return { color: "var(--icon-color)" };
});

function getDefaultColor() {
    let button = document.body.createEl("button", { cls: "mod-cta", attr: { style: "width: 0px; height: 0px;" } });
    let color = getComputedStyle(button, null).getPropertyValue("background-color");
    button.remove();
    return color;
}

let locatedColor = ref(getDefaultColor());

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
        locatedColor.value = color;
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

// switch icon
function renderSwitcherIcon() {
    return h(
        Icon,
        {size: "12px"},
        // null,
        {
            default: () => h(ArrowForwardIosRound),
        }
    )
}

// Prefix Icon
function renderPrefix({option}: {option: TreeOptionX}): VNodeChild {
    let iConChild: VNodeChild = null;
   
    switch(option.icon) {
        case "ArticleOutlined": {
            iConChild = h(ArticleOutlined)
            break;
        }
        case "AudiotrackOutlined": {
            iConChild = h(AudiotrackOutlined)
            break;
        }
        case "OndemandVideoOutlined": {
            iConChild = h(OndemandVideoOutlined)
            break;
        }
        case "CategoryOutlined": {
            iConChild = h(CategoryOutlined)
            break;
        }
        case "FilePresentOutlined": {
            iConChild = h(FilePresentOutlined)
            break;
        }
        case "ImageOutlined": {
            iConChild = h(ImageOutlined)
            break;
        }
        case "PublicOutlined": {
            iConChild = h(PublicOutlined)
            break;
        }
        case "TextFieldsOutlined": {
            iConChild = h(TextFieldsOutlined)
            break;
        }
        default: {
            return null;
        }
    }
    return h(
        Icon,
        { size: "1.2em" },
        {
            default: () => iConChild
        }
    )
}

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

// support multiple windows
plugin.app.workspace.on("window-open", (spaceWin, win) => {
	spaceWin.doc.addEventListener("scroll", handleScroll, true);
})
plugin.app.workspace.on("window-close", (spaceWin, win) => {
    spaceWin.doc.removeEventListener("scroll", handleScroll, true);
})


let toKey = (h: Heading, i: number) => "item-" + h.level + "-" + i;
let fromKey = (key: string) => parseInt((key as string).split('-')[2]);

let handleScroll = debounce(_handleScroll, 200, true);

function _handleScroll(evt: Event) {
	if(!plugin.allow_scroll) {
		return
	}

	if(plugin.jumping) {
		plugin.jumping = false
		return
	}

    let target = evt.target as HTMLElement;
    if (!target.classList.contains("markdown-preview-view") && 
        !target.classList.contains("cm-scroller") &&
        // fix conflict with outliner
        // https://github.com/guopenghui/obsidian-quiet-outline/issues/133
        !target.classList.contains("outliner-plugin-list-lines-scroller")) {
        return;
    }
	
	let isSourcemode = (plugin.current_note as MarkdownView).getMode() === "source";
    
    // if (plugin.jumping) {
	// 	if (isSourcemode) {
	// 		onPosChange(false, isSourcemode);
	// 		return
	// 	}
	// } 
    
    // if (plugin.settings.locate_by_cursor) {
    //     return;
    // }
	onPosChange(true, isSourcemode);
    
}

function onPosChange(fromScroll: boolean, isSourcemode: boolean, index?: number) {
	if(fromScroll || index === undefined) {
		const current = currentLine(fromScroll, isSourcemode);
		index = nearestHeading(current);
		if (index === undefined) return;
	}

    autoExpand(index);
    resetLocated(index);
}

store.onPosChange = onPosChange;

// 
watch(() => store.headers, () => {
	plugin.current_view_type?.contains("markdown") && onPosChange(false, true);
});

onMounted(() => {
    document.addEventListener("quiet-outline-cursorchange", handleCursorChange);
});

onUnmounted(() => {
    document.removeEventListener("quiet-outline-cursorchange", handleCursorChange);
});

function handleCursorChange(e?: CustomEvent) {
	if(!plugin.allow_cursor_change || plugin.jumping || e?.detail.docChanged) {
		return
	}

    if (plugin.settings.locate_by_cursor) {
		// fix conflict with cursor-change and scroll both triggering highlight heading change
		plugin.block_scroll()
        onPosChange(false, true);
    }
}

function currentLine(fromScroll: boolean, isSourcemode: boolean) {
    // const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    const view = plugin.current_note;
    if (!view || (plugin.current_view_type !== "markdown" /*&& plugin.current_view_type !== "embed-markdown-file"*/)) {
        return;
    }

	let markdownView = view as MarkdownView;
    if (plugin.settings.locate_by_cursor && !fromScroll) {
		return isSourcemode
			? markdownView.editor.getCursor("from").line
			: Math.ceil(markdownView.previewMode.getScroll());
        // return markdownView.editor.getCursor("from").line;
    } else {
		return isSourcemode
		// @ts-ignore
		? getCurrentLineFromEditor(markdownView.editor.cm)
		: getCurrentLineFromPreview(markdownView);	
    }
}

// line above and nearest to middle of the editor
function getCurrentLineFromEditor(editorView: EditorView): number {
	const { y, height } = editorView.dom.getBoundingClientRect()
	const middle = y + height / 2
	const lineBlocks = editorView.viewportLineBlocks;

	let line: number;
	lineBlocks.forEach(lb => {
		const node = editorView.domAtPos(lb.from).node;
		const el = (node.nodeName == "#text" ? node.parentNode : node) as HTMLElement;
		const elRect = el.getBoundingClientRect()
		const base = elRect.y + elRect.height / 2

		if(base <= middle) {
			line = editorView.state.doc.lineAt(lb.from).number
		}
	})
	
	return Math.max(line - 2, 0)
}

function getCurrentLineFromPreview(view: MarkdownView): number {
	const renderer = view.previewMode.renderer;
	const previewEl = (renderer as any).previewEl as HTMLElement;
	const rect = previewEl.getBoundingClientRect()
	const middle = rect.y + rect.height / 2

	const elsInViewport = previewEl.querySelectorAll(".markdown-preview-sizer>div:not(.markdown-preview-pusher)")
	
	let line: number;
	elsInViewport.forEach(el => {
		const { y } = el.getBoundingClientRect()
		if(y <= middle) {
			line = ((renderer as any).getSectionForElement(el) as MarkdownPreviewSection).lineStart
		}
	})
	
	return line
}

function nearestHeading(line: number): undefined | number {
    let current_heading = null;
    let i = store.headers.length;
    while (--i >= 0) {
        if (store.headers[i].position.start.line <= line) {
            current_heading = store.headers[i];
            break;
        }
    }
    if (!current_heading) {
        return;
    }

    return i;
}

function getDefaultLevel(): number {
	let level = undefined
	if(plugin.current_note?.file) {
		const cache = plugin.app.metadataCache.getFileCache(plugin.current_note.file)
		level = cache?.frontmatter?.["qo-default-level"];
		if(typeof level === "string") {
			level = parseInt(level)
		}
	}
	
	return level || parseInt(plugin.settings.expand_level)
	
}

function autoExpand(index: number) {
    if (plugin.settings.auto_expand_ext !== "disable") {
        let current_heading = store.headers[index];
        // if current heading is a parent, expand itself as well
        let should_expand = index < store.headers.length - 1 && store.headers[index].level < store.headers[index + 1].level
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
        
        if(plugin.settings.auto_expand_ext === "expand-and-collapse-rest-to-setting") {
            expanded.value = filterKeysLessThanEqual(level.value);
        } else if(plugin.settings.auto_expand_ext === "expand-and-collapse-rest-to-default") {
			const defaultLevel = getDefaultLevel()
            expanded.value = filterKeysLessThanEqual(defaultLevel);
            // expanded.value = filterKeysLessThanEqual(parseInt(plugin.settings.expand_level));
        }
        
        modifyExpandKeys(
            should_expand,
            "add",
        );
    }
}

let locateIdx = ref(0);
function resetLocated(idx: number) {
    let path = getPath(idx)
    let index = path.find((v) => !expanded.value.contains(toKey(store.headers[v], v)));
    index = index === undefined ? path[path.length - 1] : index;
	
	locateIdx.value = index

	setTimeout(() => {
		let curLocation = container.querySelector(`#no-${index}`);
		if (curLocation) {
			curLocation.scrollIntoView({ block: "center", behavior: "smooth" });
		}
	}, 100);
}

// add html attributes to nodes
interface HTMLAttr extends HTMLAttributes {
    "aria-label-position": "top" | "bottom" | "left" | "right";
    "raw": string;
}

const setAttrs = computed(() => {
    return (info: { option: TreeOption; }): HTMLAttr => {
        let lev = parseInt((info.option.key as string).split('-')[1]);
        let no = parseInt((info.option.key as string).split('-')[2]);
        let raw = info.option.label; 
		
		let locate = locateIdx.value === no ? "located" : ""

        return {
            class: `level-${lev} ${locate}`,
            id: `no-${no}`,
            "aria-label": store.ellipsis ? info.option.label : "",
            "aria-label-position": store.labelDirection,
            raw,
        };
    };
});

// on Mouseover, show popover
let triggerNode: HTMLElement = undefined;
let mouseEvent: MouseEvent = undefined;
let prevShowed = ""

function onMouseEnter(event: MouseEvent) {
    let target = event.target as HTMLElement;
    
    let node = target.closest(".n-tree-node") as HTMLElement;
    if (!node) {
        return;
    }
    triggerNode = node;
    mouseEvent = event;
    addEventListener("keydown", openPopover)
} 

function onMouseLeave(event: MouseEvent) {
    removeEventListener("keydown", openPopover)
}

const funcKeyPressed = (event: KeyboardEvent): boolean => {
    return plugin.settings.show_popover_key === "ctrlKey" && event.ctrlKey
        || plugin.settings.show_popover_key === "altKey" && event.altKey
        || plugin.settings.show_popover_key === "metaKey" && event.metaKey
}

function _openPopover(e: KeyboardEvent) {
    if (funcKeyPressed(e)) {
        plugin.app.workspace.trigger("hover-link", {
            event: mouseEvent,
            source: "preview",
            targetEl: triggerNode,
            hoverParent: {hoverPopover: null},
            linktext: "#" + triggerNode.getAttribute("raw"),
            sourcePath: plugin.current_note.file?.path,
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
        let currentLink = triggerNode?.getAttribute("raw");
        if ( currentLink !== prevShowed || fresh) {
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

function modifyExpandKeys(newKeys: string[], mode: "add" | "replace" = "replace") {
    if(mode === "replace"){
        expanded.value = newKeys;
    }else {
        const mergeSet = new Set([...expanded.value, ...newKeys]);
        expanded.value = [...mergeSet];    
    }
    syncExpandKeys();
}

function syncExpandKeys(){
    if (!plugin.current_file) return;

    plugin.heading_states[plugin.current_file] = toRaw(expanded.value);
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
	if(typeof e.detail.level === "number") {
		switchLevel(e.detail.level);
	}else if(e.detail.level === "inc") {
		switchLevel(Math.clamp(level.value + 1, 0, 5));
	}else if(e.detail.level === "dec") {
		switchLevel(Math.clamp(level.value - 1, 0, 5));
	}
})

function filterKeysLessThanEqual(lev: number): string[] {
    const newKeys = store.headers
        .map((h, i) => {
            return {level: h.level, no: i}
        })
        .filter((_, i, arr) => {
            // leaf heading cannot be expanded
            if (i === arr.length - 1 || arr[i].level >= arr[i + 1].level) {
                return false;
            }
            return arr[i].level <= lev;
        })
        .map(h => {
            return "item-" + h.level + "-" + h.no;
        });

    return newKeys
}

function offset(key: string, offset: number) {
    const parts = key.split("-");
    return `item-${parts[1]}-${parseInt(parts[2]) + offset}`;
}
// calculate expanded keys using diff
watch(
    () => toRaw(store.modifyKeys),
    ({offsetModifies, removes, adds, modifies}) => {
		// 1. remove deleted headings
		// 2. remove headings which are not parent anymore (remove some '#')
		// 3. transform index according adding and removing situations 
		// 4. transform key's level for those headings which changed its level (remove some '#'), but is still a parent
        const newExpandKeys = 
            expanded.value.filter(key => {
                const index = fromKey(key);
				const notRemove = !removes.some(remove =>(
                    remove.begin <= index && index < remove.begin + remove.length
				));
				const notParent2Child = !modifies.some(modify => (
					modify.oldBegin === index && modify.levelChangeType === "parent2child"
				));
                return notRemove && notParent2Child
            }).map(key => {
                const index = fromKey(key)
				const Parent2Parent = modifies.find(modify => modify.oldBegin === index)
                const offsetBase = offsetModifies.findLastIndex(modify => modify.begin <= index)
				let newKey = offsetBase === -1 ? key : offset(key, offsetModifies[offsetBase].offset);
				
				let newIndex = fromKey(newKey)
				if(Parent2Parent){
					return `item-${store.headers[Parent2Parent.newBegin].level}-${newIndex}`	
				}else {
					return newKey
				}
            })
		
		// for those headings which changed its level to become a parent, add its key to expanded array
		modifies.filter(modify => modify.levelChangeType === "child2parent")
			.forEach(modify => {
				newExpandKeys.push(`item-${store.headers[modify.newBegin].level}-${modify.newBegin}`)	
			})

        // make the added's parent headings expand
        adds.forEach(add => {
            const path = getPathFromArr(add.begin);
			if(add.begin >= store.headers.length - 1
			|| store.headers[add.begin].level >= store.headers[add.begin + 1].level){
				path.pop(); // remove itself
			}
            path.forEach(index => {
                newExpandKeys.push(`item-${store.headers[index].level}-${index}`);
            })
        })
        modifyExpandKeys([...new Set(newExpandKeys)])
    }
)


// force remake tree
let update_tree = ref(0);

watch(
    () => store.leafChange,
    () => {
        const old_pattern = pattern.value;

        pattern.value = "";
        level.value = getDefaultLevel()
		//  parseInt(plugin.settings.expand_level);

        const old_state = plugin.heading_states[plugin.current_file];
        if (plugin.settings.remember_state && old_state) {
            modifyExpandKeys(old_state);
        } else {
            switchLevel(level.value);
        }

        nextTick(() => {
            handleCursorChange();
            pattern.value = old_pattern;
        });

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

    // const view = store.plugin.app.workspace.getActiveViewOfType(MarkdownView)
    // let line: number = store.headers[key].position.start.line;
    // const view = plugin.current_note;
    // if (view) {
    //     view.setEphemeralState({ line });
    //     setTimeout(() => { view.setEphemeralState({ line }); }, 100);
    // }
    store.jumpBy(plugin, key);
}

// prepare data for tree component
let data2 = computed(() => {
    return makeTree(store.headers);
});

function makeTree(headers: Heading[]): TreeOption[] {

    let tree: TreeOption[] = arrToTree(headers);
    return tree;
}

function arrToTree(headers: Heading[]): TreeOption[] {
    const root: TreeOption = { children: [] };
    const stack = [{ node: root, level: -1 }];

    headers.forEach((h, i) => {
        let node: TreeOptionX = {
            label: h.heading,
            key: "item-" + h.level + "-" + i,
            line: h.position.start.line,
            icon: h.icon,
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

// get ancestor heading indexes of a given heading
function getPath(index: number) {
    let res: number[] = [];
    function pushLastGreatEq(nodes: TreeOption[]) {
        if (!nodes || nodes.length === 0) {
            return;
        }
        let idx = 0;
        for(let i = nodes.length - 1; i >= 0 ; i--) {
            let pos = fromKey(nodes[i].key as string);
            if (pos <= index) {
                res.push(pos);
                idx = i;
                break;
            }
        }
        pushLastGreatEq(nodes[idx].children);
    }
    pushLastGreatEq(data2.value);
    return res;
}
// calculate path of heading by store.header array
function getPathFromArr(index: number) {
    let res: number[] = [];
    let curLevel = store.headers[index].level + 1;
    for(let i = index; i >= 0 ; i--) {
        if(store.headers[i].level < curLevel) {
            res.push(i)
            curLevel--;
        }
    }
    return res.reverse();
}

// render markdown
marked.use({ extensions: [formula, internal_link, highlight, tag, remove_ref, nolist] });
marked.use({ walkTokens: remove_href });
marked.use({ renderer });

function renderLabel({ option }: { option: TreeOption; }) {
    let result = marked.parse(option.label).trim();

    // save mjx elements
    let i = 0;
    let mjxes = result.match(/<mjx-container.*?>.*?<\/mjx-container>/g);
    result = result.replace(/<mjx-container.*?>.*?<\/mjx-container>/g, () => {
        return `<math></math>`;
    });

    result = sanitizeHTMLToDom(`<div>${result}</div>`).children[0].innerHTML;

    // restore mjx elements
    result = result.replace(/<math.*?>.*?<\/math>/g, () => {
        return mjxes[i++];
    });

    return h("div", { innerHTML: result });
}
// to-bottom button
async function toBottom() {
    // const file = plugin.app.workspace.getActiveFile();
    // const file = plugin.current_note.file;
    // TODO: 临时措施，各View的类型不一致
    let text = plugin.current_note.data;
    if (text === undefined) {
        // @ts-ignore
        text = plugin.current_note.text;
    }
    // if (!file) {
    // }

    // let lines = (await plugin.app.vault.read(file)).split("\n");
    let lines = text.split("\n");
    const view = plugin.current_note;
    
    const scroll = () => {
        if (view instanceof FileView) {
            // For some reason, scrolling to last 4 lines gets an error.
            view.setEphemeralState({ line: lines.length - 5 });
        } else {
            setEphemeralState(view, { line: lines.length - 5 });
        }
    }

    scroll();
    setTimeout(scroll, 100);
}
// reset button
function reset() {
    pattern.value = "";
    level.value = getDefaultLevel()
	// parseInt(plugin.settings.expand_level);
    switchLevel(level.value);
}

// drag and drop
async function onDrop({ node, dragNode, dropPosition }: TreeDropInfo) {
    if (!plugin.current_note || plugin.current_view_type !== "markdown") {
        return;
    }

    const file = plugin.current_note.file;
	const text = await plugin.app.vault.read(file);
	const structure = await parseMarkdown(text);

    // let rawExpand = toRaw(expanded.value).map(getNo);
	// visitSection(structure, (section) => {
	// 	if(section.id < 0) return;
		
	// 	if(rawExpand.contains(section.id)) {
	// 		section.headingExpaned = true;
	// 	}
	// });

	const fromNo = getNo(dragNode);
	const toNo = getNo(node);

	moveHeading(structure, fromNo, toNo, dropPosition);
			  
	// let i = 0;
	// const newExpandKeys: string[] = [];
	// visitSection(structure, (section) => {
	// 	if(section.id < 0) return;
	// 	if(section.headingExpaned && section.content.children.length > 0) {
	// 		newExpandKeys.push(`item-${section.headingLevel}-${i}`)	
	// 	}
	// 	i++;
	// })

    plugin.app.vault.modify(file, stringifySection(structure));
}

function getNo(node: TreeOption | string): number {
    if (typeof node !== "string") {
        node = node.key as string;
    }
    return parseInt(node.split("-")[2]);
}

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
.n-tree-node.located p{
    color: v-bind('locatedColor');
}

/* adjust indent */

/* .quiet-outline .n-tree .n-tree-node .n-tree-node-content {
    padding-left: 0;
} */
.quiet-outline .n-tree .n-tree-node .n-tree-node-content .n-tree-node-content__prefix {
    margin-right: 0;
}
.quiet-outline .n-tree .n-tree-node .n-tree-node-content .n-tree-node-content__prefix>*:last-child {
    margin-right: 8px;
}
.n-tree-node-switcher__icon {
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
