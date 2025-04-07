// import { syntaxTree } from "@codemirror/language";
import {
  // Extension,
  // RangeSetBuilder,
  // StateField,
  // Transaction,
  // EditorState,
  // StateEffect,
} from "@codemirror/state";
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
        if(update.selectionSet) {
            document.dispatchEvent(
				new CustomEvent("quiet-outline-cursorchange", {
					detail: {docChanged: update.docChanged}
				})
			);
        }
    }

    destroy() {
      // ...
    }
}

export const editorEvent = ViewPlugin.fromClass(EditorEvent);
