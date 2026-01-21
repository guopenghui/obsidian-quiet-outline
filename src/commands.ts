import { Notice, type Command } from "obsidian";
import type QuietOutline from "./plugin";
import { store } from "./store";
import { OutlineView, VIEW_TYPE } from "./ui/view";
import { stringifyHeaders } from "./utils/heading";
import { eventBus } from "./utils/event-bus";

export function registerCommands(plugin: QuietOutline) {
    const commands: Command[] = [
        {
            id: "quiet-outline",
            name: "Quiet Outline",
            callback: () => {
                plugin.activateView();
            },
        },
        {
            id: "focus-heading-tree",
            name: "Focus Heading Tree",
            callback: async () => {
                const leaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
                if (!leaf) return;
                const view = leaf.view as OutlineView;

                await plugin.app.workspace.revealLeaf(leaf);
                view.focusOn("tree");
            },
        },
        {
            id: "quiet-outline-reset",
            name: "Reset expanding level",
            callback: () => {
                eventBus.trigger("reset-panel");
            },
        },
        {
            id: "quiet-outline-focus-input",
            name: "Focus on input",
            callback: async () => {
                const leaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
                if (!leaf) return;
                const view = leaf.view as OutlineView;
                await plugin.app.workspace.revealLeaf(leaf);
                view.focusOn("search");
            },
        },
        {
            id: "quiet-outline-copy-as-text",
            name: "Copy Current Headings As Text",
            callback: async () => {
                const headers = stringifyHeaders(
                    store.headers,
                    plugin.settings.export_format,
                );
                await navigator.clipboard.writeText(headers.join("\n"));
                new Notice("Headings copied");
            },
        },
        {
            id: "inc-level",
            name: "Increase Level",
            callback: () => {
                eventBus.trigger("levelchange", "inc");
            },
        },
        {
            id: "dec-level",
            name: "Decrease Level",
            callback: () => {
                eventBus.trigger("levelchange", "dec");
            },
        },
        {
            id: "prev-heading",
            name: "To previous heading",
            editorCallback: (editor) => {
                const line = editor.getCursor().line;

                const idx = store.headers.findLastIndex(
                    (h) => h.position.start.line < line,
                );

                idx != -1 && plugin.navigator.jump(idx);
            },
        },
        {
            id: "next-heading",
            name: "To next heading",
            editorCallback: (editor) => {
                const line = editor.getCursor().line;

                const idx = store.headers.findIndex(
                    (h) => h.position.start.line > line,
                );

                idx != -1 && plugin.navigator.jump(idx);
            },
        },
    ];

    for (const command of commands) {
        plugin.addCommand(command);
    }
}
