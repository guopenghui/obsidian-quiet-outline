
import { store } from "@/store";
import type { Ref } from "vue";
import { getPathFromArr, makeKey, isLeaf, nodeToIndex } from "./utils";

type Options = {
    pattern: Ref<string>,
    container: HTMLElement,
    locateIdx: Ref<number>,
    selectedKeys: Ref<string[]>,
    expanded: Ref<string[]>,
    modifyExpandKeys: (keys: string[], action: "add" | "remove") => void,
};

export function useOutlineController({ container, locateIdx, selectedKeys, expanded, modifyExpandKeys, pattern }: Options) {
    /** select deepest visible node in located node's path */
    function selectVisible() {
        const path = getPathFromArr(locateIdx.value);
        const firstCollapse = path.findIndex((item) => !expanded.value.contains(idxToKey(item)));
        const visibleOne = firstCollapse === -1 ? locateIdx.value : path[firstCollapse];

        selectedKeys.value = [idxToKey(visibleOne)];
    }

    /** control expanding state of current selected node */
    function setExpand(open: boolean) {
        const selectedKey = selectedKeys.value[0];
        if (!selectedKey || isLeaf(nodeToIndex(selectedKey))) return;

        if (open) {
            modifyExpandKeys([selectedKey], "add");
        } else {
            modifyExpandKeys([selectedKey], "remove");
        }
    }

    /** center current selected node */
    function center() {
        const selectedKey = selectedKeys.value[0];
        if (!selectedKey) return;

        const no = nodeToIndex(selectedKey);
        const currentNode = container.querySelector(`.n-tree .n-tree-node-wrapper:has(#no-${no})`);
        currentNode?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    /** move selection pointer */
    function move(direction: "up" | "down" | "bottom" | "top") {
        const selectedKey = selectedKeys.value[0];
        if (!selectedKey) return;

        const no = nodeToIndex(selectedKey);
        const currentNode = container.querySelector(`.n-tree .n-tree-node-wrapper:has(#no-${no})`);
        if (!currentNode) {
            const nextNode = container.querySelector(`.n-tree .n-tree-node-wrapper`)?.firstElementChild;
            if (!nextNode) return;

            moveToHeadingEl(nextNode as HTMLElement);
            return;
        }

        if (direction === "up") {
            const prevNode = currentNode.previousSibling?.firstChild as HTMLElement;
            if (prevNode) {
                moveToHeadingEl(prevNode);
            }
        } else if (direction === "down") {
            const nextNode = currentNode.nextSibling?.firstChild as HTMLElement;
            if (nextNode) {
                moveToHeadingEl(nextNode);
            }
        } else if (direction === "bottom") {
            const bottomNode = currentNode.parentElement?.lastElementChild?.firstElementChild as HTMLElement;
            if (bottomNode) {
                moveToHeadingEl(bottomNode);
            }
        } else if (direction === "top") {
            const topNode = currentNode.parentElement?.firstElementChild?.firstElementChild as HTMLElement;
            if (topNode) {
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
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function resetPattern() {
        pattern.value = "";
    }

    /** get current selected node's index */
    function currentSelected() {
        const selectedKey = selectedKeys.value[0];
        if (!selectedKey) return;

        return nodeToIndex(selectedKey);
    }

    return {
        selectVisible,
        setExpand,
        center,
        move,
        resetPattern,
        currentSelected
    };
}

function idxToKey(idx: number) {
    return makeKey(store.headers[idx].level, idx);
}
