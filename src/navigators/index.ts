import type { Component } from "obsidian";
import type { QuietOutline } from "@/plugin";
import { Nav, DummyNav } from "./base";
import { MarkDownNav } from "./markdown";
import { CanvasNav } from "./canvas";
import { KanbanNav } from "./kanban";
import { EmbedMarkdownFileNav, EmbedMarkdownTextNav } from "./embed-markdown";

type NavConstructor = new (plugin: QuietOutline, view: Component | null) => Nav;
const NAVIGATORS: { [key: string]: NavConstructor; } = {
    dummy: DummyNav,
    markdown: MarkDownNav,
    kanban: KanbanNav,
    canvas: CanvasNav,
    "embed-markdown-file": EmbedMarkdownFileNav,
    "embed-markdown-text": EmbedMarkdownTextNav,
};

export { NAVIGATORS, Nav };
