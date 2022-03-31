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
	expand_level: string;
}

const DEFAULT_SETTINGS: QuietOutlineSettings = {
	level_switch: true,
	markdown: true,
	expand_level: "0",
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
				store.leaf_change = !store.leaf_change
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

		new Setting(containerEl)
			.setName("Default Level")
			.setDesc("Default expand level when opening a new note.")
			.addDropdown(level => level
				.addOption("0","No expand")
				.addOption("1", "H1")
				.addOption("2", "H2")
				.addOption("3", "H3")
				.addOption("4", "H4")
				.addOption("5", "H5")
				.setValue(this.plugin.settings.expand_level)
				.onChange(async (value) => {
					store.plugin.settings.expand_level = value
					await this.plugin.saveSettings()
				})
			)
	}
}

