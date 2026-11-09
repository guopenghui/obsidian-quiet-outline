import { store } from "@/store";
import { ref, toRaw, watch } from "vue";
import { getPathFromArr, makeKey, keyToIndex } from "./utils";
import type QuietOutline from "@/plugin";
import { useEventBus } from "@/utils/use";

export function useOutlineExpand(plugin: QuietOutline) {
    function getDefaultLevel(): number {
        return plugin.navigator.getDefaultLevel();
    }

    const level = ref(getDefaultLevel());
    function switchLevel(lev: number) {
        level.value = lev;

        const newKeys = filterKeysLessThanEqual(lev);
        modifyExpandKeys(newKeys);
    }

    /** level switch requested by the user, mirrored as folds in the note if enabled */
    function switchLevelByUser(lev: number) {
        switchLevel(lev);
        if (!plugin.settings.fold_note_with_outline) return;

        // show headings up to `lev` unfolded, fold every deeper one (leaf headings included)
        const unfold: number[] = [];
        const fold: number[] = [];
        store.headers.forEach((heading, index) => {
            (heading.level <= lev ? unfold : fold).push(index);
        });
        plugin.navigator.foldHeadings(unfold, false);
        plugin.navigator.foldHeadings(fold, true);
    }

    useEventBus("levelchange", (arg) => {
        if (typeof arg === "number") {
            switchLevelByUser(arg);
        } else if (arg === "inc") {
            switchLevelByUser(Math.clamp(level.value + 1, 0, 5));
        } else if (arg === "dec") {
            switchLevelByUser(Math.clamp(level.value - 1, 0, 5));
        }
    });

    const expanded = ref<string[]>([]);
    /** revome invalid expand keys */
    function safeFilter(keys: string[]) {
        return keys.filter((key) => {
            const index = keyToIndex(key);
            return (
                index < store.headers.length - 1 &&
                store.headers[index].level < store.headers[index + 1].level
            );
        });
    }
    function modifyExpandKeys(keys: string[], mode: "add" | "remove" | "replace" = "replace") {
        let newKeys: string[];
        if (mode === "replace") {
            newKeys = keys;
        } else if (mode === "remove") {
            newKeys = expanded.value.filter((key) => !keys.includes(key));
        } else {
            const mergeSet = new Set([...expanded.value, ...keys]);
            newKeys = [...mergeSet];
        }
        expanded.value = safeFilter(newKeys);
        syncExpandKeys();
    }

    /** expand/collapse requested by the user, mirrored as folds in the note if enabled */
    function toggleExpandKeys(keys: string[], mode: "add" | "remove") {
        modifyExpandKeys(keys, mode);
        if (plugin.settings.fold_note_with_outline && keys.length > 0) {
            plugin.navigator.foldHeadings(keys.map(keyToIndex), mode === "remove");
        }
    }

    function syncExpandKeys() {
        const path = plugin.navigator.getPath();
        if (!path) return;

        const keys = toRaw(expanded.value);
        plugin.navigator.onExpandKeysChange(path, keys);
    }

    function autoExpand(index: number) {
        if (plugin.settings.auto_expand_ext !== "disable") {
            const current_heading = store.headers[index];
            // if current heading is a parent, expand itself as well
            const should_expand =
                index < store.headers.length - 1 &&
                store.headers[index].level < store.headers[index + 1].level
                    ? [makeKey(current_heading.level, index)]
                    : [];

            let curLevel = current_heading.level;
            let i = index;
            while (i-- > 0) {
                if (store.headers[i].level < curLevel) {
                    should_expand.push(makeKey(store.headers[i].level, i));
                    curLevel = store.headers[i].level;
                }
                if (curLevel === 1) {
                    break;
                }
            }

            if (plugin.settings.auto_expand_ext === "expand-and-collapse-rest-to-setting") {
                expanded.value = filterKeysLessThanEqual(level.value);
            } else if (plugin.settings.auto_expand_ext === "expand-and-collapse-rest-to-default") {
                const defaultLevel = getDefaultLevel();
                expanded.value = filterKeysLessThanEqual(defaultLevel);
                // expanded.value = filterKeysLessThanEqual(parseInt(plugin.settings.expand_level));
            }

            modifyExpandKeys(should_expand, "add");
        }
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
                    const index = keyToIndex(key);
                    const notRemove = !removes.some(
                        (remove) => remove.begin <= index && index < remove.begin + remove.length,
                    );
                    const notParent2Child = !modifies.some(
                        (modify) =>
                            modify.oldBegin === index && modify.levelChangeType === "parent2child",
                    );
                    return notRemove && notParent2Child;
                })
                .map((key) => {
                    const index = keyToIndex(key);
                    const Parent2Parent = modifies.find((modify) => modify.oldBegin === index);
                    const offsetBase = offsetModifies.findLastIndex(
                        (modify) => modify.begin <= index,
                    );
                    const newKey =
                        offsetBase === -1 ? key : offset(key, offsetModifies[offsetBase].offset);

                    const newIndex = keyToIndex(newKey);
                    if (Parent2Parent) {
                        return makeKey(store.headers[Parent2Parent.newBegin].level, newIndex);
                    } else {
                        return newKey;
                    }
                });

            // for those headings which changed its level to become a parent, add its key to expanded array
            modifies
                .filter((modify) => modify.levelChangeType === "child2parent")
                .forEach((modify) => {
                    newExpandKeys.push(
                        makeKey(store.headers[modify.newBegin].level, modify.newBegin),
                    );
                });

            // make the added's parent headings expand
            adds.forEach((add) => {
                const path = getPathFromArr(add.begin);
                if (
                    add.begin >= store.headers.length - 1 ||
                    store.headers[add.begin].level >= store.headers[add.begin + 1].level
                ) {
                    path.pop(); // remove itself
                }
                path.forEach((index) => {
                    newExpandKeys.push(makeKey(store.headers[index].level, index));
                });
            });
            modifyExpandKeys([...new Set(newExpandKeys)]);
        },
    );

    return {
        getDefaultLevel,
        level,
        switchLevel,
        switchLevelByUser,
        expanded,
        modifyExpandKeys,
        toggleExpandKeys,
        autoExpand,
    };
}

function offset(key: string, offset: number) {
    const parts = key.split("-");
    return makeKey(parseInt(parts[1]), parseInt(parts[2]) + offset);
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
