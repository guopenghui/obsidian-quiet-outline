import {
	debounce,
	MarkdownView,
	Notice,
	Plugin,
} from 'obsidian';

import { OutlineView, VIEW_TYPE } from './view';
import { store } from './store';

import { SettingTab, QuietOutlineSettings, DEFAULT_SETTINGS } from "./settings";


export class QuietOutline extends Plugin {
	settings: QuietOutlineSettings;
	current_note: MarkdownView;
	current_file: string;

	async onload() {
		await this.loadSettings();

		// for test
		// this.addRibbonIcon('bot', 'test something', (evt) => {
		// 	const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		// 	console.dir(view.getState())
		// })

		this.registerView(
			VIEW_TYPE,
			(leaf) => new OutlineView(leaf, this)
		);

		this.registerListener();

		this.registerCommand();

		this.addSettingTab(new SettingTab(this.app, this));



		// sync with markdown
	}

	initStore() {
		store.headers = [];
		store.dark = document.body.hasClass("theme-dark");
		store.markdown = true;
		store.ellipsis = false;
		store.leafChange = false;
		store.searchSupport = true;
		store.levelSwitch = true;
		store.hideUnsearched = true;
		store.regexSearch = false;
		store.autoExpand = true;
		store.dragModify = false;
	}
	registerListener() {
		this.registerEvent(this.app.workspace.on("css-change", () => {
			store.dark = document.body.hasClass("theme-dark");
		}));

		// refresh headings
		const refresh_outline = () => {
			const current_file = this.app.workspace.getActiveFile();
			if (current_file) {
				const headers = this.app.metadataCache.getFileCache(current_file).headings;
				if (headers) {
					store.headers = headers;
					return;
				}
			}
			store.headers = [];
		};

		const refresh = debounce(refresh_outline, 300, true);
		this.registerEvent(this.app.metadataCache.on('changed', () => {
			refresh();
		}));

		this.registerEvent(this.app.workspace.on('active-leaf-change', async (leaf) => {

			let view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view) {
				// 保证第一次获取标题信息时，也能正常展开到默认层级
				if (!this.current_note) {
					this.current_note = view;
					this.current_file = view.file.path;
					refresh_outline();
					store.refreshTree();
					return;
				}

				const pathEq = view.file.path === this.current_file;
				if (!pathEq) {
					store.refreshTree();
				}

				refresh_outline();
				this.current_note = view;
				this.current_file = view.file.path;
			}
		}));
	}

	registerCommand() {
		this.addCommand({
			id: "quiet-outline",
			name: "Quiet Outline",
			callback: () => {
				this.activateView();
			}
		});

		this.addCommand({
			id: "quiet-outline-reset",
			name: "Reset expanding level",
			callback: () => {
				dispatchEvent(new CustomEvent("quiet-outline-reset"));
			}
		});

		this.addCommand({
			id: "quiet-outline-focus-input",
			name: "Focus on input",
			callback: () => {
				let input = document.querySelector("input.n-input__input-el") as HTMLInputElement;
				if (input) {
					input.focus();
				}
			}
		});

		this.addCommand({
			id: "quiet-outline-copy-as-text",
			name: "Copy as plain text",
			callback: async () => {
				let headers = store.headers.map((h) => {
					return "    ".repeat(h.level - 1) + h.heading;
				});
				await navigator.clipboard.writeText(headers.join("\n"));
				new Notice("Headings copied");
			}
		});

	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE);
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
			});
		}
		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]
		);
	}

}



