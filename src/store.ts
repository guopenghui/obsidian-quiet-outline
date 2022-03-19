import { reactive } from 'vue'
import { QuietOutline } from './plugin'

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
})

export { store }