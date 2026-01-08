import {
    EditorView,
    type PluginValue,
    ViewUpdate,
    ViewPlugin,
} from "@codemirror/view";

class EditorEvent implements PluginValue {
    constructor(_view: EditorView) {
        // ...
    }

    update(update: ViewUpdate) {
        // ...
        if (update.selectionSet) {
            document.dispatchEvent(
                new CustomEvent("quiet-outline-cursorchange", {
                    detail: { docChanged: update.docChanged },
                }),
            );
        }
    }

    destroy() {
        // ...
    }
}

export const editorEvent = ViewPlugin.fromClass(EditorEvent);
