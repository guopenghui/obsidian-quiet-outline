import { marked } from "marked";
import { renderMath, finishRenderMath, loadMathJax } from "obsidian";
import { store } from "./store";

type Extension = marked.TokenizerExtension & marked.RendererExtension;

// parse $xxx$ format
export const formula: Extension = {
    name: "formula",
    level: "inline",
    start(src) {
        return src.match(/\$/)?.index || -1;
    },
    tokenizer(src, tokens) {
        const rule = /^\$([^\$]+)\$/;
        const match = rule.exec(src);
        if (match) {
            return {
                type: "formula",
                raw: match[0],
                formula: match[1].trim(),
            };
        }
    },
    renderer(token) {
        try {
            const formula = renderMath(token.formula, false);
            formula.setAttr("origin", token.formula);
            finishRenderMath();
            return formula.outerHTML;
        } catch {
            loadMathJax().then(() => {
                store.refreshTree();
            });
            return false;
        }
    },
};

// parse [[xxx]] format
export const internal_link: Extension = {
    name: "internal",
    level: "inline",
    start(src) {
        // when regex passed to src.match has 'g' flag, match.index will be undefined
        const match = src.match(/!?\[\[/);
        return match ? match.index! : -1;
    },
    tokenizer(src, token) {
        const rule = /^!?\[\[([^\[\]]+?)\]\]/;
        const match = rule.exec(src);
        if (match) {
            const alias = /.*\|(.*)/.exec(match[1]);
            return {
                type: "internal",
                raw: match[0],
                internal: alias ? alias[1] : match[1],
            };
        }
    },
    renderer(token) {
        return `<span class="internal-link">${token.internal}</span>`;
    },
};

// remove ref (^ab123ce | ^[footnote] | [^footnote]) format
export const remove_ref: Extension = {
    name: "ref",
    level: "inline",
    start(src) {
        const match = src.match(/\^|\[/);
        return match ? match.index! : -1;
    },
    tokenizer(src, tokens) {
        const rule = /^(\^[A-Za-z0-9\-]+)|^(\^\[[^\]]*\])|^(\[\^[^\]]*\])/;
        const match = rule.exec(src);

        if (match) {
            return {
                type: "ref",
                raw: match[0],
                ref: (match[1] || match[2] || match[3]).trim(),
            };
        }
    },
    renderer(token) {
        return "";
    },
};

// parse ==xxx== format
export const highlight: Extension = {
    name: "highlight",
    level: "inline",
    start(src) {
        const match = src.match(/==/);
        return match ? match.index! : -1;
    },
    tokenizer(src, token) {
        const rule = /^==([^=]+)==/;
        const match = rule.exec(src);
        if (match) {
            return {
                type: "highlight",
                raw: match[0],
                internal: match[1],
            };
        }
    },
    renderer(token) {
        return `<mark>${token.internal}</mark>`;
    },
};

// parse tags eg. #tag
export const tag: Extension = {
    name: "tag",
    level: "inline",
    start(src) {
        const match = src.match(/^#|(?<=\s)#/);
        return match ? match.index! : -1;
    },
    tokenizer(src, token) {
        const rule =
            /^#([^\[\]{}:;'"`~,.<>?|\\!@#$%^&*()=+\d\s][^\[\]{}:;'"`~,.<>?|\\!@#$%^&*()=+\s]*)/;
        const match = rule.exec(src);
        if (match) {
            return {
                type: "tag",
                raw: match[0],
                internal: match[1],
            };
        }
    },
    renderer(token) {
        return `<a href="" class="tag" target="_blank" rel="noopener">#${token.internal}</a>`;
    },
};

// remove url inside <a>
export const remove_href = (token: marked.Token) => {
    if (token.type === "link") {
        token.href = "javascript:void(0);";
    }
};

// remove list
export const tokenizer: marked.Tokenizer = {
    // @ts-ignore
    list(src) { },
};
