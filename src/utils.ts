import {App, CachedMetadata} from "obsidian";
import type {Heading, ModifyKeys} from "./store"

// a trick to use obsidian builtin function to parse markdown headings
export async function parseMetaDataCache(app: App, text: string): Promise<CachedMetadata> {
    // @ts-ignore
    const res = await app.internalPlugins.plugins['canvas']._children[0].parseText(text)
    return res;
}

type Diff = {
    type: 'add' | 'remove' | 'modify',
    begin: number,
    length: number,
}

const MODIFY_CHECK_STEP = 5;
export function diff(prev: Heading[], cur: Heading[]): Diff[] {
    let i = 0, j = 0;
    let res: Diff[] = []
    while(i < prev.length && j < cur.length) {
        // same heading, pass
        if(prev[i].heading === cur[j].heading) {
            i++; j++;
            continue;
        }

        // decide add or remove or modify by least steps
        const action = addOrRemoveOrModify(prev, cur, i, j);
        res.push({
            type: action.type,
            begin: i,
            length: action.length,
        });
        action.type === "add" 
            ? j += action.length
            : action.type === "remove"
                ? i += action.length
                : (i += action.length, j += action.length);
    }
    
    // deal with rest
    if(i === prev.length && j !== cur.length) {
        res.push({
            type: 'add',
            begin: i,
            length: cur.length - j
        })
    }
    if(i !== prev.length && j === cur.length) {
        res.push({
            type: 'remove',
            begin: i,
            length: prev.length - i
        })
        
    }
    return res
}

function addOrRemoveOrModify(prev: Heading[], cur: Heading[], i: number, j: number): 
    {type: 'add' | 'remove' | 'modify', length: number} {
    const stepAdd = findSteps(prev[i], cur, j);
    const stepRm = findSteps(cur[j], prev, i);
    const stepMod = findModifyStep(prev, cur, i, j);
    const res = [
        {type: 'add', length: stepAdd},
        {type: 'remove', length: stepRm},
        {type: 'modify', length: stepMod},
    ] as {type: 'add' | 'remove' | 'modify', length: number}[];
    res.sort((a, b) => a.length - b.length);

    // choose remove first
    if(res[0].type == 'add' && res[1].type == 'remove' && res[0].length === res[1].length) {
        return res[1];
    }

    return res[0];
}
function findSteps(target: Heading, arr: Heading[], from: number): number {
    const res = arr.slice(from);
    let step = res.findIndex(heading => heading.heading === target.heading && heading.level === target.level);
    step = step < 0 ? res.length : step
    return step
}
function findModifyStep(prev: Heading[], cur: Heading[], i: number, j: number) {
    let step = Math.min(prev.length - i - 1, cur.length - j - 1, MODIFY_CHECK_STEP);
    for(let id = 1; step > 0 && id <= step; id++) {
        if(prev[i+id].heading === cur[j+id].heading
            && prev[i+id].level === cur[j+id].level
        ) {
            return id;
        }
    }
    return Number.MAX_VALUE;
}

export function calcModifies(prev: Heading[], cur: Heading[]) {
    const headingDiff = diff(prev, cur);
    const modifyKeys: ModifyKeys = {modifies: [], removes: [], adds: []};
    let offset = 0;
    headingDiff.forEach(diff => {
        switch(diff.type) {
            case "add": {
                modifyKeys.adds.push({
                    // add position in new store.headers
                    begin: offset + diff.begin,
                })
                offset += diff.length;
                modifyKeys.modifies.push({
                    begin: diff.begin,
                    offset,
                })
                break;
            }
            case "remove": {
                offset -= diff.length;
                modifyKeys.modifies.push({
                    begin: diff.begin + diff.length,
                    offset,
                })
                modifyKeys.removes.push({
                    begin: diff.begin,
                    length: diff.length
                })
                break;
            }
        }
    })
    return modifyKeys;
}

export {}