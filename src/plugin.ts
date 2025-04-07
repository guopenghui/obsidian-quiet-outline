import {
	Constructor,
	debounce,
	MarkdownView,
	Notice,
	Plugin,
	View,
} from 'obsidian';
// import { around } from "monkey-around"

import { OutlineView, VIEW_TYPE } from './ui/view';
import {Nav, NAVGATORS} from './navigators';
import { store } from './store';
import { debounceCb } from "./utils/debounce"

import { SettingTab, QuietOutlineSettings, DEFAULT_SETTINGS } from "./settings";

export class QuietOutline extends Plugin {
	settings: QuietOutlineSettings;
	navigator: Nav = new NAVGATORS["dummy"](this, null as any);
	jumping: boolean;
	heading_states: Record<string, string[]> = {};
	klasses: Record<string, Constructor<any>> = {};
	
	allow_scroll = true;
	block_scroll: () => void;
	allow_cursor_change = true;
	block_cursor_change: () => void;

	async onload() {
		await this.loadSettings();

		// TEST: 测试插件功能
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
		
		// only manually activate view when first time install
		// @ts-ignore
		if(__IS_DEV__ || await this.firstTimeInstall()) {
			this.activateView();
		}
		
		this.block_scroll = debounceCb(
			() => { this.allow_scroll = false; }, 
			300, 
			() => { this.allow_scroll = true; }, 
		);
		this.block_cursor_change = debounceCb(
			() => { this.allow_cursor_change = false; },
			300,
			() => { this.allow_cursor_change = true; },
		);
	}
	
	async firstTimeInstall() {
		const existSettingFile = await this.app.vault.adapter.exists(this.manifest.dir + "/data.json");
		return !existSettingFile
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
		// store.autoExpand = this.settings.auto_expand;
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
		
		// remove states from closed notes
		this.registerEvent(this.app.workspace.on("layout-change", () => {
			const leaves = this.app.workspace.getLeavesOfType("markdown");
			const filteredStates: Record<string, string[]> = {};
			leaves.forEach((leaf) => {
				// when app is just opened, if a markdown tab is not activated,
				// there is no 'file' field in leaf.view
				if((leaf.view as  MarkdownView).file === undefined) {
					return
				}
				const path = (leaf.view as MarkdownView).file!.path;
				this.heading_states[path] && 
					(filteredStates[path] = this.heading_states[path]);
			})

			this.heading_states = filteredStates;
		}));
		

		this.registerEvent(this.app.metadataCache.on('changed', (file, data, cache) => {
			// console.log("metadata changed", {cache});
			this.refresh("file-modify");
		}));

		this.registerEvent(this.app.workspace.on('active-leaf-change', async (leaf) => {
			const view = this.app.workspace.getActiveFileView();

			// when there is no active file-view, eg. no file is opened or an empty view is focused.
			if (!view) {
				await this.updateNav("dummy", null as any);
				await this.refresh_outline();
				store.refreshTree();
				return;
			}

			// when switching to a non-file-view, like outline and tags panel, do nothing.
			if(!leaf || view && view !== leaf.view) {
				return;
			}

			// block cursor change event to trigger auto-expand when switching between notes
			this.block_cursor_change() 

			await this.updateNav(view.getViewType(), view);
			await this.refresh_outline();
			store.refreshTree();
		}));
	}

	// set store.headers
	refresh_outline = async (reason?: "file-modify") => {
		if(reason === "file-modify") {
			await this.navigator.updateHeaders();
		}else {
			await this.navigator.setHeaders();
		}
	};

	refresh = debounce(this.refresh_outline, 300, true);

	async onunload() {
		await this.navigator.unload();
		// this.app.workspace.detachLeavesOfType(VIEW_TYPE);
	}
	
	async updateNav(type: string, view: View) {
		await this.navigator.unload();
		const NavType = NAVGATORS[type] || NAVGATORS["dummy"];
		this.navigator = new NavType(this, view);
		await this.navigator.load();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		// fix console error
		// https://github.com/guopenghui/obsidian-quiet-outline/issues/154
		if (this.app.workspace.rightSplit === null) return;

		if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length === 0
		) {
			await this.app.workspace.getRightLeaf(false)?.setViewState({
				type: VIEW_TYPE,
				active: true,
			});
		}
		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]
		);
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
				const input = document.querySelector("input.n-input__input-el") as HTMLInputElement;
				if (input) {
					input.focus();
				}
			}
		});

		this.addCommand({
			id: "quiet-outline-copy-as-text",
			name: "Copy Current Headings As Text",
			callback: async () => {
				function merge(arr1: string[], arr2: string[]) {
					return Array(arr1.length + arr2.length).fill("")
						.map((_, i) => i % 2 === 0 ? arr1[i / 2] : arr2[(i - 1) / 2])	
				}

				const parts = this.settings.export_format.split(/\{.*?\}/);
				const keys = this.settings.export_format.match(/(?<={)(.*?)(?=})/g) || [];

				function transform(h: typeof store.headers[number]) {
					const num = nums[h.level - 1];
					const fields = keys.map(key => {
						switch (key) {
							case "title": {
								return h.heading	
							}
							case "path" : {
								return "#" + h.heading.replace(/ /g, "%20")
							}
							case "bullet": {
								return "-"
							}
							case "num": {
								return num.toString()
							}
							case "num-nest": {
								return num.toString()
							}
						}
						const match = key.match(/num-nest\[(.*?)\]/);

						if(match) {
							const sep = match[1];
							return nums.slice(0, h.level).join(sep);	
						}
						
						return ""
					});
					
					return merge(parts, fields).join("");
				}

				const nums = [0, 0, 0, 0, 0, 0];
				const headers: string[] = [];
				store.headers.forEach((h) => {
					nums.forEach((num, i) => {
						if(i > h.level - 1) {
							nums[i] = 0
						}
					})
					nums[h.level - 1]++;

					const text = "\t".repeat(h.level - 1) + transform(h);
					headers.push(text);
				});

				await navigator.clipboard.writeText(headers.join("\n"));
				new Notice("Headings copied");
			}
		});
		
		this.addCommand({
			id: "inc-level",
			name: "Increase Level",
			callback: () => {
				dispatchEvent(new CustomEvent("quiet-outline-levelchange", {detail: {level: "inc"}}));
			}
		});
		
		this.addCommand({
			id: "dec-level",
			name: "Decrease Level",
			callback: () => {
				dispatchEvent(new CustomEvent("quiet-outline-levelchange", {detail: {level: "dec"}}));
			}
		});
		
		this.addCommand({
			id: "prev-heading",
			name: "To previous heading",
			editorCallback: (editor) => {
				const line = editor.getCursor().line;
				
				const idx = store.headers.findLastIndex(h => h.position.start.line < line);
				
				idx != -1 && this.navigator.jump(idx);
			}
		})

		this.addCommand({
			id: "next-heading",
			name: "To next heading",
			editorCallback: (editor) => {
				const line = editor.getCursor().line;
				
				const idx = store.headers.findIndex(h => h.position.start.line > line);
				
				idx != -1 && this.navigator.jump(idx);
			}
		})

	}
}
