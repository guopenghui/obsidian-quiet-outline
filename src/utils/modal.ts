import { App, ButtonComponent, Modal, setIcon } from "obsidian";
import { t } from "../lang/helper";

/**
 * Confirm modal CSS class names (styles should live in `src/stalin.css`)
 * - Right-aligned buttons with spacing
 * - Vertically centered icon and text
 */
const CONFIRM_MODAL_CLASS = "quiet-outline-confirm-modal";
const CONFIRM_MODAL_BUTTONS_CLASS = "quiet-outline-confirm-modal__buttons";
const CONFIRM_MODAL_BTN_ICON_CLASS = "quiet-outline-confirm-modal__btn-icon";

/**
 * Options for the generic confirmation modal
 */
export interface ConfirmModalOptions {
    /**
     * Modal title (optional)
     * - string: rendered as-is
     * - i18nKey: translated via this plugin's `t()`
     */
    title?: string | { i18nKey: Parameters<typeof t>[0]; };

    /**
     * Modal message body (required)
     * - string: rendered as-is
     * - i18nKey: translated via this plugin's `t()`
     */
    message: string | { i18nKey: Parameters<typeof t>[0]; };

    /**
     * Confirm button text (optional, default: Confirm)
     * - string: rendered as-is
     * - i18nKey: translated via this plugin's `t()`
     */
    confirmText?: string | { i18nKey: Parameters<typeof t>[0]; };

    /**
     * Cancel button text (optional, default: Cancel)
     * - string: rendered as-is
     * - i18nKey: translated via this plugin's `t()`
     */
    cancelText?: string | { i18nKey: Parameters<typeof t>[0]; };

    /**
     * Confirm button icon (optional), uses Obsidian built-in icon names
     * e.g. 'check', 'trash', 'alert-triangle', etc.
     */
    confirmIcon?: string;

    /**
     * Cancel button icon (optional), uses Obsidian built-in icon names
     */
    cancelIcon?: string;

    /**
     * Called when the user clicks "Confirm" (can be async)
     * - If it throws, the modal will not auto-close (so you can handle errors and keep it open)
     */
    onConfirm: () => void | Promise<void>;

    /**
     * Called when the user clicks "Cancel" or dismisses the modal (ESC / overlay click) (optional)
     */
    onCancel?: () => void | Promise<void>;

    /**
     * Whether the modal can be dismissed via ESC / overlay click (default: true)
     * - If false, it can only be closed via buttons (still recommended to keep a Cancel button)
     */
    allowClose?: boolean;

    /**
     * Whether to auto-close the modal after confirming (default: true)
     */
    closeOnConfirm?: boolean;
}

/**
 * Resolve display text (supports i18nKey)
 */
function resolveText(input?: string | { i18nKey: Parameters<typeof t>[0]; }, fallback = ""): string {
    if (input === undefined || input === null) return fallback;
    if (typeof input === "string") return input;
    return t(input.i18nKey);
}

/**
 * Generic confirmation modal:
 * - Uses Obsidian built-in `Modal`
 * - Two actions: Confirm / Cancel
 * - Confirm is styled as warning (dangerous operation)
 * - Buttons support icons (Obsidian built-in icon system)
 * - Button labels support i18n via this plugin's `t()`
 */
export class ConfirmModal extends Modal {
    private readonly options: ConfirmModalOptions;

    constructor(app: App, options: ConfirmModalOptions) {
        super(app);
        this.options = options;
    }

    onOpen(): void {
        const { contentEl } = this;

        // Title
        const title = resolveText(this.options.title);
        if (title) this.titleEl.setText(title);

        // Body
        const message = resolveText(this.options.message);

        // Render message as multiple paragraphs:
        // - Split by blank lines to form paragraphs
        // - Within each paragraph, keep single newlines as <br>
        // - Avoid innerHTML to prevent HTML injection
        const paragraphs = message
            .split(/\n\s*\n/g)
            .map((p) => p.trim())
            .filter(Boolean);

        for (const para of paragraphs) {
            const pEl = contentEl.createEl("p");
            const lines = para.split("\n");
            for (let i = 0; i < lines.length; i++) {
                if (i > 0) pEl.createEl("br");
                pEl.appendText(lines[i]);
            }
        }

        // Add a root class for styling
        contentEl.addClass(CONFIRM_MODAL_CLASS);

        // Button row (right-aligned with spacing)
        const buttonRow = contentEl.createDiv({ cls: CONFIRM_MODAL_BUTTONS_CLASS });

        const cancelText = resolveText(
            this.options.cancelText,
            // Note: this project uses the English source string as the i18n key for `t()`
            t("Cancel" as any),
        );
        const confirmText = resolveText(
            this.options.confirmText,
            t("Confirm" as any),
        );

        // Confirm button (dangerous action: warning color) — placed on the left
        const confirmBtn = new ButtonComponent(buttonRow)
            .setButtonText(confirmText)
            .setCta()
            .onClick(async () => {
                await this.safeConfirm();
            });

        // Use Obsidian built-in warning button styling
        confirmBtn.setClass("mod-warning");

        if (this.options.confirmIcon) {
            prependIconToButton(confirmBtn, this.options.confirmIcon);
        }

        // Cancel button (safe: no special color) — placed on the right
        const cancelBtn = new ButtonComponent(buttonRow)
            .setButtonText(cancelText)
            .onClick(async () => {
                await this.safeCancel();
                this.close();
            });

        if (this.options.cancelIcon) {
            prependIconToButton(cancelBtn, this.options.cancelIcon);
        }

        // Dismiss behavior: ESC / overlay click
        if (this.options.allowClose === false) {
            // Disable overlay click to dismiss
            // `overlayEl` usually exists on Modal; keep a null-safe guard
            // @ts-ignore
            const overlayEl: HTMLElement | undefined = (this as any).overlayEl;
            if (overlayEl) overlayEl.onclick = null;

            // Disable ESC to dismiss: override `closeOnEscape` (Modal reads this flag internally)
            // @ts-ignore
            (this as any).closeOnEscape = false;
        }

        // Default focus: make "Cancel" more prominent (pause before a dangerous action)
        // Also improves keyboard usability
        cancelBtn.buttonEl.focus();
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private async safeConfirm(): Promise<void> {
        const closeOnConfirm = this.options.closeOnConfirm ?? true;

        // Execute the confirm callback first; if it throws, keep the modal open for external handling
        await this.options.onConfirm();

        if (closeOnConfirm) this.close();
    }

    private async safeCancel(): Promise<void> {
        if (this.options.onCancel) {
            await this.options.onCancel();
        }
    }
}

/**
 * Prepend an Obsidian icon (SVG) before the button text
 * Notes:
 * - `setIcon` injects an SVG into the container element
 * - We prepend the icon container to `buttonEl` so it appears before the text
 */
function prependIconToButton(btn: ButtonComponent, iconName: string): void {
    const iconWrap = btn.buttonEl.createSpan({
        cls: CONFIRM_MODAL_BTN_ICON_CLASS,
    });

    setIcon(iconWrap, iconName);

    // Prepend the icon container so the icon appears before the text
    btn.buttonEl.prepend(iconWrap);
}

/**
 * Convenience helper: use the confirmation modal as a Promise
 * - resolve(true): confirmed
 * - resolve(false): cancelled/dismissed
 *
 * Note:
 * - To keep this utility generic, it does not execute the dangerous action for you.
 *   You should `await` the result and handle the operation yourself.
 */
export function confirm(app: App, options: Omit<ConfirmModalOptions, "onConfirm" | "onCancel">): Promise<boolean> {
    return new Promise((resolve) => {
        const modal = new ConfirmModal(app, {
            ...options,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
        });

        // Treat any dismissal as "cancel"
        const originalOnClose = modal.onClose.bind(modal);
        modal.onClose = () => {
            // If dismissed via ESC/overlay click, also treat as "cancel"
            resolve(false);
            originalOnClose();
        };

        modal.open();
    });
}
