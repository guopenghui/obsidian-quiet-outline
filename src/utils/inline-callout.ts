import { getIcon } from "obsidian";

type InlineCallout = {
    icon: string;
    label?: string;
    color?: string;
};

const INLINE_CALLOUT_CODE = /^\[!!(.+)\]$/;
const INLINE_CALLOUT_CODE_SPAN = /`(\[!![^`\n]+\])`/g;

export function postProcessInlineCallouts(el: HTMLElement) {
    el.querySelectorAll("code").forEach((code) => {
        const callout = createInlineCalloutElement(code.innerText.trim());
        if (callout) {
            code.replaceWith(callout);
        }
    });
}

export function replaceInlineCalloutsWithText(text: string | undefined) {
    return (text || "").replace(INLINE_CALLOUT_CODE_SPAN, (_match, raw: string) => {
        const parsed = parseInlineCallout(raw);
        return parsed?.label || "";
    });
}

function createInlineCalloutElement(raw: string) {
    const callout = parseInlineCallout(raw);
    if (!callout) return null;

    const icon = getIcon(callout.icon) || getIcon(`lucide-${callout.icon}`);
    if (!icon) return null;

    const container = document.createElement("span");
    const iconEl = document.createElement("span");
    const labelEl = document.createElement("span");

    container.addClass("inline-callout");
    container.setAttr("data-inline-callout", callout.icon);
    iconEl.addClass("inline-callout-icon");
    iconEl.setAttr("data-tooltip-position", "top");
    iconEl.setAttr("aria-label", callout.icon);
    iconEl.appendChild(icon);
    container.appendChild(iconEl);

    if (callout.label) {
        labelEl.addClass("inline-callout-label");
        labelEl.setText(callout.label);
        container.appendChild(labelEl);
    }

    applyColor(container, iconEl, callout);
    return container;
}

function parseInlineCallout(raw: string): InlineCallout | null {
    const match = INLINE_CALLOUT_CODE.exec(raw);
    if (!match) return null;

    const parts = match[1].split("|");
    const icon = parts[0]?.trim().replace(/\\+$/, "").toLowerCase();
    if (!icon) return null;

    return {
        icon,
        label: cleanPart(parts[1]),
        color: cleanPart(parts[2]),
    };
}

function cleanPart(part: string | undefined) {
    const clean = part?.trim().replace(/\\+$/, "");
    return clean ? clean : undefined;
}

function applyColor(container: HTMLElement, iconEl: HTMLElement, callout: InlineCallout) {
    if (!callout.color) return;

    const color = calloutColor(callout.color);
    if (!color) return;

    if (callout.label) {
        container.style.color = color;
        container.style.backgroundColor = backgroundColor(callout.color);
    } else {
        iconEl.style.color = color;
    }
}

function calloutColor(value: string) {
    if (!isSafeColorValue(value)) return null;
    return `rgba(${value}, 1)`;
}

function backgroundColor(value: string) {
    return `rgba(${value}, var(--inline-callout-bg-transparency, .1))`;
}

function isSafeColorValue(value: string) {
    return /^var\(--[\w-]+\)$/.test(value) || /^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(value);
}
