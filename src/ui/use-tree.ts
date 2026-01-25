import { type Heading, store } from "@/store";
import { computed, ref } from "vue";
import type { HTMLAttributes, ComputedRef, Ref } from "vue";
import type { TreeOptionX } from "./types";
import type { TreeOption } from "naive-ui";
import { getPathFromArr, makeKey, keyToIndex } from "./utils";
import { Menu } from "obsidian";
import { normal, separator, setupMenu } from "@/utils/menu";
import type QuietOutline from "@/plugin";
import { t } from "@/lang/helper";
import { useDomEvent } from "@/utils/use";

// add html attributes to nodes
interface HTMLAttr extends HTMLAttributes {
    "data-tooltip-position": "top" | "bottom" | "left" | "right";
    raw: string;
    [key: string]: unknown;
}

type OutlineTreeOptions = {
    plugin: QuietOutline,
    container: HTMLElement;
    level: Ref<number>,
    expanded: Ref<string[]>,
    modifyExpandKeys: (newKeys: string[], mode: "add" | "remove" | "replace") => void,
};

export function useOutlineTree({ plugin, container, expanded, modifyExpandKeys }: OutlineTreeOptions) {
    // prepare data for tree component
    const data = computed(() => {
        return makeTree(store.headers);
    });

    const locateIdx = ref(0);
    const selectedKeys = ref<string[]>([]);

    useDomEvent(window, "click", () => { selectedKeys.value = []; });

    function resetLocated(idx: number) {
        const path = getPathFromArr(idx);
        let index = path.find(
            (v) => !expanded.value.contains(makeKey(store.headers[v].level, v)),
        );
        index = index === undefined ? path[path.length - 1] : index;

        locateIdx.value = index;

        setTimeout(() => {
            if (!plugin.settings.auto_scroll_into_view) return;
            const curLocation = container.querySelector(`#no-${index}`);
            if (curLocation) {
                curLocation.scrollIntoView({ block: "center", behavior: "smooth" });
            }
        }, 100);
    }

    const nodeProps = computed(() => {
        return (info: { option: TreeOption; }): HTMLAttr => {
            const lev = parseInt((info.option.key as string).split("-")[1]);
            const no = parseInt((info.option.key as string).split("-")[2]);
            const raw = info.option.label || "";

            const locate = locateIdx.value === no ? "located" : "";

            // click and jump
            async function jump(node: TreeOption): Promise<void> {
                // if (nodes[0] === undefined) {
                //     return;
                // }

                const key_value = (node.key as string).split("-");
                const key = parseInt(key_value[2]);
                plugin.navigator.jumpWhenClick(key);
            }

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
                    const { self, siblings, descendants } = getNode(data, keyToIndex(info.option.key as string));
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

    return {
        data,
        nodeProps,
        locateIdx,
        resetLocated,
        selectedKeys,
    };
}

function makeTree(headers: Heading[]): TreeOptionX[] {
    const tree: TreeOptionX[] = arrToTree(headers);
    return tree;
}

function arrToTree(headers: Heading[]): TreeOptionX[] {
    const root: TreeOptionX = { children: [] };
    const stack = [{ node: root, level: -1 }];

    headers.forEach((h, i) => {
        const node: TreeOptionX = {
            label: h.heading,
            key: makeKey(h.level, i),
            line: h.position.start.line,
            icon: h.icon,
            no: i
        };

        while (h.level <= stack.last()!.level) {
            stack.pop();
        }

        const parent = stack.last()!.node;
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
function getNode(data: ComputedRef<TreeOptionX[]>, index: number): {
    self: TreeOptionX,
    path: TreeOptionX[],
    siblings: TreeOptionX[],
    descendants: TreeOptionX[];
} {
    const path: TreeOptionX[] = [];
    function pushLastGreatEq(nodes: TreeOption[] | undefined) {
        if (!nodes || nodes.length === 0) {
            return;
        }
        let idx = 0;
        for (let i = nodes.length - 1; i >= 0; i--) {
            let pos = keyToIndex(nodes[i].key as string);
            if (pos <= index) {
                path.push(nodes[i]);
                idx = i;
                break;
            }
        }
        pushLastGreatEq(nodes[idx].children);
    }
    pushLastGreatEq(data.value);

    const self = path[path.length - 1];
    const siblings = path[path.length - 2]
        ? path[path.length - 2].children || []
        : data.value;

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

export function filterKeysLessThanEqual(lev: number): string[] {
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
            return makeKey(h.level, h.no);
        });

    return newKeys;
}
