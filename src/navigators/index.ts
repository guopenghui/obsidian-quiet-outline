import type { Component } from "obsidian";
import type QuietOutline from "@/plugin";
import { Nav, DummyNav } from "./base";
import { MarkDownNav } from "./markdown";
import { CanvasNav } from "./canvas";
import { KanbanNav } from "./kanban";
import { EmbedMarkdownFileNav, EmbedMarkdownTextNav } from "./embed-markdown";

type NavConstructor = new (plugin: QuietOutline, view: any) => Nav;
const NAVIGATORS = {
    dummy: DummyNav,
    markdown: MarkDownNav,
    kanban: KanbanNav,
    canvas: CanvasNav,
    "embed-markdown-file": EmbedMarkdownFileNav,
    "embed-markdown-text": EmbedMarkdownTextNav,
} satisfies { [key: string]: NavConstructor; };

function createNav<Name extends keyof typeof NAVIGATORS>(
    name: Name, plugin: QuietOutline, view: Component | null
): InstanceType<typeof NAVIGATORS[Name]>;
function createNav(name: string, plugin: QuietOutline, view: Component | null): Nav;
function createNav(name: string, plugin: QuietOutline, view: Component | null): Nav {
    const Ctor = (NAVIGATORS as Record<string, NavConstructor>)[name];
    if (!Ctor) return new DummyNav(plugin, view);
    return new Ctor(plugin, view);
}

export { createNav, Nav };
