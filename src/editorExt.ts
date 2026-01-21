import {
    EditorView,
    type PluginValue,
    ViewUpdate,
    ViewPlugin,
} from "@codemirror/view";
import { eventBus } from "./utils/event-bus";

class EditorEvent implements PluginValue {
    constructor(_view: EditorView) {
        // ...
    }

    update(update: ViewUpdate) {
        // ...
        if (update.selectionSet) {
            eventBus.trigger("cursorchange", update.docChanged);
        }
    }

    destroy() {
        // ...
    }
}

export const editorEvent = ViewPlugin.fromClass(EditorEvent);
