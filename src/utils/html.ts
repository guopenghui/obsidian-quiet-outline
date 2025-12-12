import { compile } from "html-to-text";
export function escapeHtml(unsafe: string) {
    return unsafe
        .replace(/&/g, "&amp;") // 必须先替换 &
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export const htmlToText = compile({
    wordwrap: false
});

export const getOrigin = compile({
    selectors: [{ selector: "mjx-container", format: "origin" }],
    formatters: {
        "origin": (elem, walk, builder, options) => {
            builder.openBlock();
            builder.addInline(elem.attribs.origin);
            builder.closeBlock();
        }
    }
});
