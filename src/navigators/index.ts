import type { Component } from "obsidian";
import type QuietOutline from "@/plugin";
import { Nav, DummyNav } from "./base";
import { MarkDownNav } from "./markdown";
import { CanvasNav } from "./canvas";
import { KanbanNav } from "./kanban";
import { EmbedMarkdownFileNav, EmbedMarkdownTextNav } from "./embed-markdown";
import { PdfNav } from "./pdf";

const NAVIGATORS = {
    dummy: DummyNav,
    markdown: MarkDownNav,
    kanban: KanbanNav,
    canvas: CanvasNav,
    pdf: PdfNav,
    "embed-markdown-file": EmbedMarkdownFileNav,
    "embed-markdown-text": EmbedMarkdownTextNav,
};

type NavigatorName = keyof typeof NAVIGATORS;

type NavigatorMap = {
    [Name in NavigatorName]: InstanceType<(typeof NAVIGATORS)[Name]>;
};

type NavigatorViewMap = {
    [Name in NavigatorName]: ConstructorParameters<(typeof NAVIGATORS)[Name]>[1];
};

type NavConstructor<Name extends NavigatorName> =
    new (
        plugin: QuietOutline,
        view: NavigatorViewMap[Name],
    ) => NavigatorMap[Name];

function isKnownNav(name: string): name is NavigatorName {
    return name in NAVIGATORS;
}

function createKnownNav<Name extends NavigatorName>(
    name: Name,
    plugin: QuietOutline,
    view: NavigatorViewMap[Name],
): NavigatorMap[Name] {
    const Ctor = NAVIGATORS[name] as NavConstructor<Name>;
    return new Ctor(plugin, view);
}

function createNav<Name extends keyof typeof NAVIGATORS>(
    name: Name, plugin: QuietOutline, view: NavigatorViewMap[Name]
): InstanceType<typeof NAVIGATORS[Name]>;
function createNav(name: string, plugin: QuietOutline, view: Component | null): Nav;
function createNav(name: string, plugin: QuietOutline, view: Component | null): Nav {
    if (isKnownNav(name)) {
        return createKnownNav(name, plugin, view);
    }
    return new DummyNav(plugin, view);
}

export { createNav, Nav };
