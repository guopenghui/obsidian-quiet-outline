import { reactive } from 'vue'
import { HeadingCache } from 'obsidian'
import { QuietOutline } from './plugin'


const store = reactive({
    plugin: undefined as QuietOutline,
    activeView() {
        this.plugin.activateView()
        this.dark = document.querySelector('body').classList.contains('theme-dark')
    },
    headers:[] as HeadingCache[],
    dark: false,
})

export { store }