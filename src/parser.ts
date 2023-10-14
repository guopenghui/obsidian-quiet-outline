import { marked } from 'marked';
import { renderMath, finishRenderMath, loadMathJax } from 'obsidian';
import { store } from './store';

type Extension = marked.TokenizerExtension & marked.RendererExtension;

// parse $xxx$ format
export const formula: Extension = {
    name: "formula",
    level: "inline",
    start(src) {
        return src.match(/\$/)?.index;
    },
    tokenizer(src, tokens) {
        const rule = /^\$([^\$]+)\$/;
        const match = rule.exec(src);
        if (match) {
            return {
                type: 'formula',
                raw: match[0],
                formula: match[1].trim(),
            };
        }
    },
    renderer(token) {
        try {
            const formula = renderMath(token.formula, false).outerHTML;
            finishRenderMath();
            return formula;
        } catch {
            loadMathJax().then(() => {
                //store.activeView()
                store.refreshTree();
            });
            return false;
        }
    }
};

// parse [[xxx]] format
export const internal_link: Extension = {
    name: "internal",
    level: "inline",
    start(src) {
        return src.match(/\[\[/)?.index;
    },
    tokenizer(src, token) {
        const rule = /^\[\[([^\[\]]+?)\]\]/;
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
    }
};

// remove ref (^ab123ce) format
export const remove_ref: Extension = {
    name: "ref",
    level: "inline",
    start(src) {
        return src.match(/\^/)?.index;
    },
    tokenizer(src, tokens) {
        const rule = /^(\^[A-Za-z0-9\-]+)$/;
        const match = rule.exec(src);
        
        if (match) {
            return {
                type: 'ref',
                raw: match[0],
                ref: match[1].trim(),
            };
        }
    },
    renderer(token) {
        return "";
    }
};

// parse ==xxx== format
export const highlight: Extension = {
    name: "highlight",
    level: "inline",
    start(src) {
        return src.match(/==/)?.index;
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
    }
};

// parse tags eg. #tag
export const tag: Extension = {
    name: "tag",
    level: "inline",
    start(src) {
        return src.match(/^#|(?<=\s)#/)?.index;
    },
    tokenizer(src, token) {
        const rule = /^#([^\[\]{}:;'"`~,.<>?|\\!@#$%^&*()=+\d\s][^\[\]{}:;'"`~,.<>?|\\!@#$%^&*()=+\s]*)/;
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
    }
};

// remove url inside <a>
export const remove_href = (token: marked.Token) => {
    if (token.type === "link") {
        token.href = "javascript:void(0);";
    }
};


// remove <ol>
export const renderer = {
    listitem(text: string, task: boolean, checked: boolean) {
        return `${text}`;
    }

};

// remove list format rendering
export const nolist: Extension = {
    name: "nolist",
    level: "block",
    start(src) {
        return src.match(/^([+\-*]|\d+\.) /)?.index
    },
    tokenizer(src, tokens) {
        const rule = /^(([+\-*])|(\d+)\.) (.*)/;
        const match = rule.exec(src);
        let token = undefined;
        if (match && match[2]) {
            token = {
                type: "nolist",
                raw: match[0],
                ordered: false,
                marker: match[2],
                start: "",
                body: match[4],
                tokens: [],
            };
        } else if (match && match[3]) {
            token = {
                type: "nolist",
                raw: match[0],
                ordered: true,
                marker: "",
                start: match[3],
                body: match[4],
                tokens: [],
            };
        }
        
        token && this.lexer.inline(token.body, token.tokens);
        
        return token;
    },
    renderer(token) {
        let body = this.parser.parseInline(token.tokens, null);
        
        if (token.ordered)
            return `<p>${token.start}. ${body}</p>`;
        else
            return `<p>${token.marker} ${body}</p>`;
    }
}