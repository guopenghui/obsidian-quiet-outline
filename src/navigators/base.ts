import {Component, HeadingCache} from "obsidian";
import type {QuietOutline} from "@/plugin";
import {store} from "@/store";

export abstract class Nav extends Component {
	private _loaded: boolean = false;
	canDrop: boolean = false;
	plugin: QuietOutline;

	constructor(plugin: QuietOutline){
		super()
		this.plugin = plugin;
	}
	async load(): Promise<void> {
		if(!this._loaded) {
			this._loaded = true;
			// @ts-ignore
			if(!this.constructor._installed) {
				await this.install();
				// @ts-ignore
				this.constructor._installed = true;
			}
			await this.onload();
		}
		
	}
	async unload(): Promise<void> {
		if(!this._loaded) return;
		this._loaded = false;
		// @ts-ignore
		for(;this._events.length > 0;) this._events.pop()();

		await this.onunload();
	}
	getDefaultLevel() {
		return parseInt(this.plugin.settings.expand_level);
	}
	getPath() {
		return "";
	}
	abstract getId(): string;
	async install() {}
	async onload(): Promise<void> {}
	async onunload(): Promise<void> {}
	async handleDrop(from: number, to: number, position: "before" | "after" | "inside"){}
	toBottom(){}
	abstract jump(key: number): Promise<void>;
	abstract getHeaders(): Promise<HeadingCache[]>;
	abstract setHeaders(): Promise<void>;
	abstract updateHeaders(): Promise<void>;
}

export class DummyNav extends Nav {
	getId() { return "dummy";}
	async jump(_key: number){}
	async getHeaders(): Promise<HeadingCache[]> { return []}
	async setHeaders(): Promise<void> {store.headers = []}
	async updateHeaders(){}
}
