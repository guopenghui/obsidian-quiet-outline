import { 
	App, 
	debounce,
	MarkdownView, 
	Notice, 
	Plugin, 
	PluginSettingTab, 
	Setting,
} from 'obsidian'

import { OutlineView, VIEW_TYPE } from './view'
import { store } from './store'


interface QuietOutlineSettings {
	level_switch: boolean;
	markdown: boolean;
}

const DEFAULT_SETTINGS: QuietOutlineSettings = {
	level_switch: true,
	markdown: true,
}

export class QuietOutline extends Plugin {
	settings: QuietOutlineSettings;

	async onload() {
		await this.loadSettings()
		
		store.plugin = this
		store.dark = document.querySelector('body').classList.contains('theme-dark')
		
		this.registerView(
			VIEW_TYPE,
			(leaf) => new OutlineView(leaf)				
		)
		
		
		// for test
		// this.addRibbonIcon('dice','test something',(evt)=>{
		// 	this.app.workspace.detachLeavesOfType(VIEW_TYPE)
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
			const current_file = this.app.workspace.getActiveFile()
			if(current_file) {
				const headers = this.app.metadataCache.getFileCache(current_file).headings
				if(headers){
					store.headers = headers
					return
				}
			}
			
			store.headers = []
		}

		const refresh = debounce(refresh_outline, 300, true)
		this.registerEvent(this.app.metadataCache.on('changed', () => {
			refresh()
		}))

		this.registerEvent(this.app.workspace.on('active-leaf-change', async () => {
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
			.setName('Render Markdown')
			.setDesc('Render heading string as markdown format.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.markdown)
				.onChange(async (value) => {
					store.plugin.settings.markdown = value
					await this.plugin.saveSettings();
				})
				)
				
		new Setting(containerEl)
			.setName("Level Switch")
			.setDesc("Expand headings to certain level.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.level_switch)
				.onChange(async (value) => {
					store.plugin.settings.level_switch = value
					await this.plugin.saveSettings()
				})
			)
	}
}

