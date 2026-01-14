import type { TreeOption } from "naive-ui";
import { computed, ref } from "vue";
import { store } from "@/store";
import { escapeHtml, getOrigin, htmlToText } from "@/utils/html"
import { marked } from "marked";

export function useOutlineSearch() {
    const pattern = ref("");
    const filter = computed(() => {
        return store.regexSearch ? regexFilter : simpleFilter;
    });

    const matchCount = computed(() => {
        return store.headers.filter((h) => {
            const node = { label: h.heading } as TreeOption;
            return filter.value(pattern.value, node);
        }).length;
    });

    return {
        pattern,
        filter,
        matchCount
    }
}

function regexFilter(pattern: string, option: TreeOption): boolean {
    let rule = /.*/;
    try {
        rule = RegExp(pattern, "i");
    } catch {

    }
    return rule.test(mdToHtmlTextContent(option.label));
}

function simpleFilter(pattern: string, option: TreeOption): boolean {
    return mdToHtmlTextContent(option.label).toLowerCase()
        .contains(pattern.toLowerCase());
}

/**
 * Convert markdown to HTML text content.
 *
 * (**NO SANITIZED!!!** for performance)
 * @param text - The markdown text to convert.
 * @param keepRawFormula - Whether to keep raw formula in the output.
 * @returns The textContent (**no sanitized!!!**)
 */
function mdToHtmlTextContent(text: string | undefined) {
    let result = marked.parse(text || "", { async: false }).trim();

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
