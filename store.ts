import { ref, reactive } from 'vue'
import { Editor, EditorRange } from 'obsidian'
import QuietOutline from './main'

export interface HeadLine {
    text: string,
    line: number,
}


const store = reactive({
    plugin: undefined as QuietOutline,
    activeView() {
        this.plugin.activateView()
    },
    headers:[] as HeadLine[],
    text: "",
    dark: false,
    editor: undefined,
    scroll(range: EditorRange, center: boolean) {
        if(this.editor){
            let editor: Editor = this.editor
            editor.scrollIntoView(range, center)
        }
    }
})

export { store }