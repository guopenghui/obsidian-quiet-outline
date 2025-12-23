import { Heading, store } from "@/store";
import { TreeOption } from "naive-ui";

export function headingToKey(h: Heading, i: number) {
    return "item-" + h.level + "-" + i;
}

export function keyToIndex(key: string) {
    return parseInt((key as string).split("-")[2]);
}

export function nodeToIndex(node: TreeOption | string): number {
    if (typeof node !== "string") {
        node = node.key as string;
    }
    return parseInt(node.split("-")[2]);
}

export function isLeaf(idx: number) {
    return idx === store.headers.length - 1
        || store.headers[idx + 1].level <= store.headers[idx].level;
}

// calculate path of heading by store.header array
export function getPathFromArr(index: number) {
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
