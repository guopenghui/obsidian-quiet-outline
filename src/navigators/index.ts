import type {View} from "obsidian";
import type {QuietOutline} from "@/plugin";
import {Nav, DummyNav} from "./base";
import {MarkDownNav} from "./markdown";
import {CanvasNav} from "./canvas";
import {KanbanNav} from "./kanban";
import {EmbedMarkdownFileNav, EmbedMarkdownTextNav} from "./embed-markdown";

type NavConstructor = new (plugin: QuietOutline, view: View) => Nav;
const NAVGATORS: {[key: string]: NavConstructor} = {
	"dummy": DummyNav,
	"markdown": MarkDownNav,
	"kanban": KanbanNav,
	"canvas": CanvasNav,
	"embed-markdown-file": EmbedMarkdownFileNav,
	"embed-markdown-text": EmbedMarkdownTextNav,
};


export {NAVGATORS, Nav};
