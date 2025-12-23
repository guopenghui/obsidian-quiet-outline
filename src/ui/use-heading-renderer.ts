import { marked } from "marked";
import { NInput, TreeOption } from "naive-ui";
import type { QuietOutline } from "@/plugin";
import { store } from "@/store";
import { Icon } from "@vicons/utils";
import { computed, h, ref, VNodeChild } from "vue";
import { ArrowForwardIosRound, LocalIcon } from "./icons";
import {
    formula,
    internal_link,
    highlight,
    tag,
    remove_href,
    remove_ref,
    tokenizer,
} from "../parser";
import { sanitizeHTMLToDom } from "obsidian";
import { TreeOptionX } from "./types";

type RenderMethodType = ({ option }: { option: TreeOptionX; }) => ReturnType<typeof h>;

export function useOutlineRenderer(plugin: QuietOutline) {
    marked.use({
        extensions: [formula, internal_link, highlight, tag, remove_ref],
    });
    marked.use({ walkTokens: remove_href });
    marked.use({ tokenizer });

    let editingHeadingText = ref<string | undefined>();
    const renderLabel = computed<RenderMethodType>(() => {
        let renderer: RenderMethodType = store.markdown
            ? renderMarkdown
            : ({ option }) => h("div", option.label);

        const method: RenderMethodType = ({ option }) => {
            if (option.key !== store.currentEditingKey) {
                return renderer({ option });
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
                    } else if (e.key === "Escape") {
                        store.currentEditingKey = "";
                        editingHeadingText.value = undefined;
                    }
                },
            });
        };
        return method;
    });

    return {
        renderLabel,
        renderSwitcherIcon,
        editingHeadingText,
        renderPrefix,
    };
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

function renderMarkdown({ option }: { option: TreeOption; }) {
    const result = mdToHtml(option.label);
    return h("div", { innerHTML: result });
}

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
function renderPrefix({ option }: { option: TreeOptionX; }): VNodeChild {
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
