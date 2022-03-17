import { 
	App, 
	debounce,
	Editor, 
	MarkdownView, 
	Modal, 
	Notice, 
	Plugin, 
	PluginSettingTab, 
	Setting,
	loadMathJax 
} from 'obsidian';

import { OutlineView, VIEW_TYPE } from './view'

import { store, HeadLine } from './store'


interface MyPluginSettings {
	mySetting: string;
	markdown: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	markdown: false,
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

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
		
		this.addCommand({
			id: "quiet-outline",
			name: "Quiet Outline",
			callback: () => { 
				this.activateView()
			}
		})

		this.addSettingTab(new SampleSettingTab(this.app,this))
		
		const refresh_outline = () => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView)
			if(!view) {
				store.headers = []
				return
			}
			const editor = view.editor
			const text = editor.getValue()
			let headers = text.split('\n')
								.map((s,i)=>({text:s, line:i}))
								.filter(({text})=>{
									return text.startsWith("# ")||
											text.startsWith("## ")||
											text.startsWith("### ") ||
											text.startsWith("#### ") ||
											text.startsWith("##### ") ||
											text.startsWith("###### ") ||
											text.startsWith("```")
								})
			let real_headers: HeadLine[] = []
			let in_code_block = false
			
			headers.forEach((entry) => {
				if(entry.text.startsWith('```')){
					in_code_block = !in_code_block
				} else {
					if(!in_code_block) {
						real_headers.push(entry)
					}
				}
			})
				
			store.headers = real_headers
			store.editor = editor
		}

		const refresh = debounce(refresh_outline,0.3,true)
		this.app.workspace.on('editor-change',(editor,markdown)=>{
			refresh()
		})

		this.app.workspace.on('active-leaf-change',(leaf)=>{
			new Promise((resolve,reject) => {
				refresh_outline()
				resolve(0)
			})
		})
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
	onModeChange(callback:(dark:boolean) => void) {
		let body = document.querySelector("body")
		let Observer = new MutationObserver((mutations)=>{
			mutations.forEach((mutation) => {
				if(mutation.attributeName === 'class') {
					callback(body.classList.contains("theme-dark"))
				}   
			})
		})
		Observer.observe(body,{
			attributeFilter: ['class']
		})	
	}
}



class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for Quiet Outline.'});

		
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
