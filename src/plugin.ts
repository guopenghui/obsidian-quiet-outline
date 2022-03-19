import { 
	App, 
	debounce,
	MarkdownView, 
	Notice, 
	Plugin, 
	PluginSettingTab, 
	Setting,
	loadMathJax 
} from 'obsidian'

import { OutlineView, VIEW_TYPE } from './view'
import { store, HeadLine } from './store'


interface QuietOutlineSettings {
	mySetting: string;
	markdown: boolean;
}

const DEFAULT_SETTINGS: QuietOutlineSettings = {
	mySetting: 'default',
	markdown: false,
}

export class QuietOutline extends Plugin {
	settings: QuietOutlineSettings;

	async onload() {
		await this.loadSettings()
		await loadMathJax()
		
		store.plugin = this
		store.dark = document.querySelector('body').classList.contains('theme-dark')
		
		this.registerView(
			VIEW_TYPE,
			(leaf) => new OutlineView(leaf)				
		)
		
		this.onModeChange((dark) => {
			if(dark) {
				store.dark = true
			} else {
				store.dark = false
			}
		})
		
		// for test
		// this.addRibbonIcon('dice','test something',(evt)=>{

		// })

		this.addCommand({
			id: "quiet-outline",
			name: "Quiet Outline",
			callback: () => { 
				this.activateView()
			}
		})

		this.addSettingTab(new SettingTab(this.app, this))
		
		const refresh_outline = () => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView)

			if(!view) {
				store.headers = []
				return
			}

			const text = view.editor.getValue()
			let head_or_block = text.split('\n')
								.map((s, i) => ({text: s, line: i}))
								.filter(({text})=>{
									return text.startsWith("# ")||
											text.startsWith("## ")||
											text.startsWith("### ") ||
											text.startsWith("#### ") ||
											text.startsWith("##### ") ||
											text.startsWith("###### ") ||
											text.startsWith("```")
								})

			let headers: HeadLine[] = []
			let in_code_block = false
			
			head_or_block.forEach((entry) => {
				if(entry.text.startsWith('```')){
					in_code_block = !in_code_block
				} else {
					if(!in_code_block) {
						headers.push(entry)
					}
				}
			})
				
			store.headers = headers
		}

		const refresh = debounce(refresh_outline, 0.3, true)
		this.registerEvent(this.app.workspace.on('editor-change', () => {
			refresh()
		}))

		this.registerEvent(this.app.workspace.on('active-leaf-change', async () => {
				await new Promise((resolve) => { resolve(0) })
				refresh_outline()
		}))
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE)
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE)

		await this.app.workspace.getRightLeaf(false).setViewState({
			type: VIEW_TYPE,
			active: true,
		})
		
		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]
		)
	}
	
	// observe theme change from <body>
	onModeChange(callback: (dark: boolean) => void) {
		let body = document.querySelector("body")
		let Observer = new MutationObserver((mutations)=>{
			mutations.forEach((mutation) => {
				if(mutation.attributeName === 'class') {
					callback(body.classList.contains("theme-dark"))
				}   
			})
		})
		Observer.observe(body, {
			attributeFilter: ['class']
		})	
	}
}

class SettingTab extends PluginSettingTab {
	plugin: QuietOutline;

	constructor(app: App, plugin: QuietOutline) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty()
		containerEl.createEl('h2', {text: 'Settings for Quiet Outline.'})

		new Setting(containerEl)
			.setName('Render markdown')
			.setDesc('Render heading string as markdown format.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.markdown)
				.onChange(async (value) => {
					store.plugin.settings.markdown = value
					await this.plugin.saveSettings();
				})
				)
	}
}

