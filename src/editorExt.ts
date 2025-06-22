// import { syntaxTree } from "@codemirror/language";
import {} from // Extension,
// RangeSetBuilder,
// StateField,
// Transaction,
// EditorState,
// StateEffect,
"@codemirror/state";
import {
    // Decoration,
    // DecorationSet,
    // WidgetType,
    EditorView,
    PluginValue,
    ViewUpdate,
    ViewPlugin,
} from "@codemirror/view";

class EditorEvent implements PluginValue {
    constructor(view: EditorView) {
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
