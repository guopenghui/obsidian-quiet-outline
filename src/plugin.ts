import {
	debounce,
	FileView,
	MarkdownView,
	Notice,
	Plugin,
	View,
} from 'obsidian';

import { OutlineView, VIEW_TYPE } from './view';
import { store } from './store';

import { SettingTab, QuietOutlineSettings, DEFAULT_SETTINGS } from "./settings";


export class QuietOutline extends Plugin {
	settings: QuietOutlineSettings;
	current_note: FileView;
	current_file: string;

	async onload() {
		await this.loadSettings();

		// for test
		// this.addRibbonIcon('bot', 'test something', (evt) => {
		// 	const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		// 	console.dir(view.getState())
		// })

		this.initStore();

		this.registerView(
			VIEW_TYPE,
			(leaf) => new OutlineView(leaf, this)
		);

		this.registerListener();

		this.registerCommand();

		this.addSettingTab(new SettingTab(this.app, this));
	}

	initStore() {
		store.headers = [];
		store.dark = document.body.hasClass("theme-dark");
		store.markdown = this.settings.markdown;
		store.ellipsis = this.settings.ellipsis;
		store.labelDirection = this.settings.label_direction;
		store.leafChange = false;
		store.searchSupport = this.settings.search_support;
		store.levelSwitch = this.settings.level_switch;
		store.hideUnsearched = this.settings.hide_unsearched;
		store.regexSearch = this.settings.regex_search;
		store.autoExpand = this.settings.auto_expand;
		store.dragModify = this.settings.drag_modify;
		store.patchColor = this.settings.patch_color;
		store.primaryColorLight = this.settings.primary_color_light;
		store.primaryColorDark = this.settings.primary_color_dark;
		store.rainbowLine = this.settings.rainbow_line;
		store.rainbowColor1 = this.settings.rainbow_color_1;
		store.rainbowColor2 = this.settings.rainbow_color_2;
		store.rainbowColor3 = this.settings.rainbow_color_3;
		store.rainbowColor4 = this.settings.rainbow_color_4;
		store.rainbowColor5 = this.settings.rainbow_color_5;
	}
	registerListener() {
		this.registerEvent(this.app.workspace.on("css-change", () => {
			store.dark = document.body.hasClass("theme-dark");
			store.cssChange = !store.cssChange;
		}));

		// refresh headings
		const refresh_outline = () => {
			const current_file = this.app.workspace.getActiveFile();
			if (current_file) {
				const cache = this.app.metadataCache.getFileCache(current_file);
				if (cache && cache.headings) {
					store.headers = cache.headings;
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
			// @ts-ignore
			let view: FileView = this.app.workspace.getActiveFileView(); 
			if (!view) return;

			if (view.getViewType() === "markdown") {
				store.jumpBy = markdownJump
			} else if (view.getViewType() === "kanban") {
				store.jumpBy = kanbanJump
			} else {
				store.jumpBy = dummyJump
			}

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
				return;
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
export function dummyJump(plugin: QuietOutline, key: number) {}

function markdownJump(plugin: QuietOutline, key: number) {
    let line: number = store.headers[key].position.start.line;

    // const view = store.plugin.app.workspace.getActiveViewOfType(MarkdownView)
    const view = plugin.current_note;
    if (view) {
        view.setEphemeralState({ line });
        setTimeout(() => { view.setEphemeralState({ line }); }, 100);
    }
}

function kanbanJump(plugin: QuietOutline, key: number) {
	const panes = document.querySelectorAll(
		'.workspace-leaf[style=""] .kanban-plugin__lane-wrapper'
	);
	
	panes[key]?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
}

