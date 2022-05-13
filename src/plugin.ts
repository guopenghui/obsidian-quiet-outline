import {
	debounce,
	MarkdownView,
	Notice,
	Plugin,
} from 'obsidian'

import { OutlineView, VIEW_TYPE } from './view'
import { store } from './store'

import { SettingTab, QuietOutlineSettings, DEFAULT_SETTINGS } from "./settings"


export class QuietOutline extends Plugin {
	settings: QuietOutlineSettings;

	async onload() {
		await this.loadSettings()

		store.plugin = this
		store.dark = document.querySelector('body').classList.contains('theme-dark')

		this.registerView(
			VIEW_TYPE,
			(leaf) => new OutlineView(leaf, this)
		)


		// for test
		// this.addRibbonIcon('bot', 'test something', (evt) => {
		// 	const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		// 	console.dir(view.getState())
		// })

		this.addCommand({
			id: "quiet-outline",
			name: "Quiet Outline",
			callback: () => {
				this.activateView()
			}
		})

		this.addSettingTab(new SettingTab(this.app, this))


		// refresh headings
		const refresh_outline = () => {
			const current_file = this.app.workspace.getActiveFile()
			if (current_file) {
				const headers = this.app.metadataCache.getFileCache(current_file).headings
				if (headers) {
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

		// sync with markdown
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
		if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length === 0) {
			await this.app.workspace.getRightLeaf(false).setViewState({
				type: VIEW_TYPE,
				active: true,
			})
		}
		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]
		)
	}

}



