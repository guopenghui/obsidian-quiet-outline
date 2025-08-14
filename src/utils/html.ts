export function escapeHtml(unsafe: string) {
    return unsafe
        .replace(/&/g, "&amp;") // 必须先替换 &
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
