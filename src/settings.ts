import { App, PluginSettingTab, Setting } from "obsidian";
import { QuietOutline } from "./plugin";
import { store } from "./store";
import { t } from "./lang/helper";

interface QuietOutlineSettings {
    // General settings
    search_support: boolean;
    level_switch: boolean;
    markdown: boolean;
    expand_level: string;
    hide_unsearched: boolean;
    auto_expand_ext:
        | "only-expand"
        | "expand-and-collapse-rest-to-default"
        | "expand-and-collapse-rest-to-setting"
        | "disable";
    regex_search: boolean;
    ellipsis: boolean;
    label_direction: "top" | "bottom" | "left" | "right";
    drag_modify: boolean;
    locate_by_cursor: boolean;
    show_popover_key: "ctrlKey" | "altKey" | "metaKey" | "disable";
    persist_md_states: boolean;
    keep_search_input: boolean;
    export_format: string;
    lang_direction_decide_by: "system" | "text";
    auto_scroll_into_view: boolean;
    vimlize_canvas: boolean;
    canvas_sort_by: "area" | "name_asc" | "name_desc";

    // Style settings
    patch_color: boolean;
    primary_color_light: string;
    primary_color_dark: string;
    rainbow_line: boolean;
    rainbow_color_1: string;
    rainbow_color_2: string;
    rainbow_color_3: string;
    rainbow_color_4: string;
    rainbow_color_5: string;

    // New style settings
    font_size: string;
    font_family: string;
    font_weight: string;
    line_height: string;
    line_gap: string;

    // Font color settings
    custom_font_color: boolean;
    h1_color: string;
    h2_color: string;
    h3_color: string;
    h4_color: string;
    h5_color: string;
    h6_color: string;
}

const DEFAULT_SETTINGS: QuietOutlineSettings = {
    // General settings
    search_support: true,
    level_switch: true,
    markdown: true,
    expand_level: "0",
    hide_unsearched: true,
    auto_expand_ext: "only-expand",
    regex_search: false,
    ellipsis: false,
    label_direction: "left",
    drag_modify: false,
    locate_by_cursor: false,
    show_popover_key: "ctrlKey",
    persist_md_states: true,
    keep_search_input: false,
    export_format: "{title}",
    lang_direction_decide_by: "system",
    auto_scroll_into_view: true,
    vimlize_canvas: true,
    canvas_sort_by: "area",

    // Style settings
    patch_color: true,
    primary_color_light: "#18a058",
    primary_color_dark: "#63e2b7",
    rainbow_line: false,
    rainbow_color_1: "#FD8B1F",
    rainbow_color_2: "#FFDF00",
    rainbow_color_3: "#07EB23",
    rainbow_color_4: "#2D8FF0",
    rainbow_color_5: "#BC01E2",

    // New style settings
    font_size: "",
    font_family: "",
    font_weight: "",
    line_height: "",
    line_gap: "",

    // Font color settings
    custom_font_color: false,
    h1_color: "#000000",
    h2_color: "#000000",
    h3_color: "#000000",
    h4_color: "#000000",
    h5_color: "#000000",
    h6_color: "#000000",
};

class SettingTab extends PluginSettingTab {
    plugin: QuietOutline;
    private activeTab: "general" | "styles" = "general";

    constructor(app: App, plugin: QuietOutline) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl("h2", { text: t("Settings for Quiet Outline.") });

        // Create tab navigation
        const tabContainer = containerEl.createDiv({ cls: "quiet-outline-tabs" });
        const generalTab = tabContainer.createEl("button", {
            text: t("General"),
            cls: this.activeTab === "general" ? "active" : ""
        });
        const stylesTab = tabContainer.createEl("button", {
            text: t("Styles"),
            cls: this.activeTab === "styles" ? "active" : ""
        });

        // Tab click handlers
        generalTab.addEventListener("click", () => {
            this.activeTab = "general";
            this.display();
        });

        stylesTab.addEventListener("click", () => {
            this.activeTab = "styles";
            this.display();
        });

        // Content container
        const contentContainer = containerEl.createDiv({ cls: "quiet-outline-tab-content" });

        if (this.activeTab === "general") {
            this.renderGeneralSettings(contentContainer);
        } else {
            this.renderStyleSettings(contentContainer);
        }
    }

    private renderGeneralSettings(container: HTMLElement): void {
        container.empty();

        new Setting(container)
            .setName(t("Search Support"))
            .setDesc(t("Add a searching area on the top"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.search_support)
                    .onChange(async (value) => {
                        this.plugin.settings.search_support = value;
                        store.searchSupport = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(container)
            .setName(t("Level Switch"))
            .setDesc(t("Expand headings to certain level."))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.level_switch)
                    .onChange(async (value) => {
                        this.plugin.settings.level_switch = value;
                        store.levelSwitch = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(container)
            .setName(t("Render Markdown"))
            .setDesc(t("Render heading string as markdown format."))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.markdown)
                    .onChange(async (value) => {
                        this.plugin.settings.markdown = value;
                        store.markdown = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(container)
            .setName(t("Default Level"))
            .setDesc(t("Default expand level when opening a new note."))
            .addDropdown((level) =>
                level
                    .addOption("0", t("No expand"))
                    .addOption("1", "H1")
                    .addOption("2", "H2")
                    .addOption("3", "H3")
                    .addOption("4", "H4")
                    .addOption("5", "H5")
                    .setValue(this.plugin.settings.expand_level)
                    .onChange(async (value) => {
                        this.plugin.settings.expand_level = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(container)
            .setName(t("Hide Unsearched"))
            .setDesc(t("Hide irrelevant headings when searching"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.hide_unsearched)
                    .onChange(async (value) => {
                        this.plugin.settings.hide_unsearched = value;
                        store.hideUnsearched = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(container)
            .setName(t("Regex Search"))
            .setDesc(t("Search headings using regular expression"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.regex_search)
                    .onChange(async (value) => {
                        this.plugin.settings.regex_search = value;
                        store.regexSearch = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(container)
            .setName(t("Auto Expand"))
            .setDesc(
                t(
                    "Auto expand and collapse headings when scrolling and cursor position change",
                ),
            )
            .addDropdown((mode) =>
                mode
                    .addOption("only-expand", t("Only Expand"))
                    .addOption(
                        "expand-and-collapse-rest-to-default",
                        t("Expand and Collapse Rest to Default"),
                    )
                    .addOption(
                        "expand-and-collapse-rest-to-setting",
                        t(
                            "Expand and Collapse Rest to Setting Level (Level Switch)",
                        ),
                    )
                    .addOption("disable", t("Disabled"))
                    .setValue(this.plugin.settings.auto_expand_ext)
                    .onChange(
                        async (
                            value:
                                | "only-expand"
                                | "expand-and-collapse-rest-to-default"
                                | "expand-and-collapse-rest-to-setting"
                                | "disable",
                        ) => {
                            this.plugin.settings.auto_expand_ext = value;
                            await this.plugin.saveSettings();
                        },
                    ),
            );

        new Setting(container)
            .setName(t("Auto Scroll Into View"))
            .setDesc(t("Auto scroll located heading into view"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.auto_scroll_into_view)
                    .onChange(async (value) => {
                        this.plugin.settings.auto_scroll_into_view = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(container)
            .setName(t("Locate By Cursor"))
            .setDesc(
                t(
                    "Highlight and Auto expand postion will be determined by cursor position",
                ),
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.locate_by_cursor)
                    .onChange(async (value) => {
                        this.plugin.settings.locate_by_cursor = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(container)
            .setName(t("Show Popover on hover"))
            .setDesc(t("Press functional key and move cursor to heading"))
            .addDropdown((funcKey) =>
                funcKey
                    .addOption("ctrlKey", "Ctrl")
                    .addOption("altKey", "Alt")
                    .addOption("metaKey", "Meta")
                    .addOption("disable", t("Disable"))
                    .setValue(this.plugin.settings.show_popover_key)
                    .onChange(
                        async (
                            value: "ctrlKey" | "altKey" | "metaKey" | "disable",
                        ) => {
                            this.plugin.settings.show_popover_key = value;
                            await this.plugin.saveSettings();
                        },
                    ),
            );

        new Setting(container)
            .setName(t("Persist Markdown States"))
            .setDesc(
                t(
                    "Save and restore cursor, scroll state of markdown note, as well as expanded/collapsed state of headings",
                ),
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.persist_md_states)
                    .onChange(async (value) => {
                        this.plugin.settings.persist_md_states = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(container)
            .setName(t("Keep Search Input"))
            .setDesc(t("Keep search input when switching between notes"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.keep_search_input)
                    .onChange(async (value) => {
                        this.plugin.settings.keep_search_input = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(container)
            .setName(t("Vimlize Canvas"))
            .setDesc(t("Add vim-like keymap for canvas"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.vimlize_canvas)
                    .onChange(async (value) => {
                        this.plugin.settings.vimlize_canvas = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(container)
            .setName(t("Canvas Sort Order"))
            .setDesc(t("Sort method for canvas nodes"))
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("area", t("Sort by Area"))
                    .addOption("name_asc", t("Sort by Name (A -> Z)"))
                    .addOption("name_desc", t("Sort by Name (Z -> A)"))
                    .setValue(this.plugin.settings.canvas_sort_by)
                    .onChange(
                        async (
                            value: "area" | "name_asc" | "name_desc",
                        ) => {
                            this.plugin.settings.canvas_sort_by = value;
                            await this.plugin.saveSettings();
                            // 触发刷新
                            this.plugin.refresh();
                        },
                    ),
            );

        new Setting(container)
            .setName(t("Drag headings to modify note"))
            .setDesc(t("❗ This will modify note content, be careful."))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.drag_modify)
                    .onChange(async (value) => {
                        this.plugin.settings.drag_modify = value;
                        store.dragModify = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(container)
            .setName(t("Ellipsis"))
            .setDesc(t("Keep one line per heading"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.ellipsis)
                    .onChange(async (value) => {
                        this.plugin.settings.ellipsis = value;
                        store.ellipsis = value;
                        await this.plugin.saveSettings();
                        store.refreshTree();
                        this.display();
                    }),
            );

        if (this.plugin.settings.ellipsis) {
            new Setting(container)
                .setName(t("Tooltip direction"))
                .addDropdown((level) =>
                    level
                        .addOption("left", "Left")
                        .addOption("right", "Right")
                        .addOption("top", "Top")
                        .addOption("bottom", "Bottom")
                        .setValue(this.plugin.settings.label_direction)
                        .onChange(
                            async (
                                value: "top" | "bottom" | "left" | "right",
                            ) => {
                                this.plugin.settings.label_direction = value;
                                store.labelDirection = value;
                                await this.plugin.saveSettings();
                                store.refreshTree();
                            },
                        ),
                );
        }

        new Setting(container)
            .setName(t("Text Direction"))
            .setDesc(t("is decided by"))
            .addDropdown((what) =>
                what
                    .addOption("system", "Obsidian Language")
                    .addOption("text", "Specific text of heading")
                    .setValue(this.plugin.settings.lang_direction_decide_by)
                    .onChange(async (value: "system" | "text") => {
                        this.plugin.settings.lang_direction_decide_by = value;
                        store.textDirectionDecideBy = value;
                        await this.plugin.saveSettings();
                        store.refreshTree();
                    }),
            );

        new Setting(container)
            .setName(t("Export Format"))
            .addText((text) =>
                text
                    .setValue(this.plugin.settings.export_format)
                    .onChange(async (value) => {
                        this.plugin.settings.export_format = value;
                        await this.plugin.saveSettings();
                    })
                    .inputEl.setAttribute("style", "width: 100%;"),
            )
            .addExtraButton((button) =>
                button
                    .setIcon("help")
                    .setTooltip("release doc 0.3.32")
                    .onClick(() =>
                        window.open(
                            "https://github.com/guopenghui/obsidian-quiet-outline/releases/tag/0.3.32",
                        ),
                    ),
            );
    }

    private renderStyleSettings(container: HTMLElement): void {
        container.empty();

        // Primary Color Settings
        new Setting(container)
            .setName(t("Set Primary Color"))
            .addToggle((toggle) =>
                toggle
                    .setTooltip(t("Patch default color"))
                    .setValue(this.plugin.settings.patch_color)
                    .onChange(async (value) => {
                        this.plugin.settings.patch_color = value;
                        store.patchColor = value;
                        this.plugin.saveSettings();
                    }),
            )
            .addColorPicker((color) =>
                color
                    .setValue(this.plugin.settings.primary_color_light)
                    .onChange(async (value) => {
                        this.plugin.settings.primary_color_light = value;
                        store.primaryColorLight = value;
                        this.plugin.saveSettings();
                    }),
            )
            .addColorPicker((color) =>
                color
                    .setValue(this.plugin.settings.primary_color_dark)
                    .onChange(async (value) => {
                        this.plugin.settings.primary_color_dark = value;
                        store.primaryColorDark = value;
                        this.plugin.saveSettings();
                    }),
            );

        // Rainbow Line Settings
        new Setting(container)
            .setName(t("Set Rainbow Line Color"))
            .addToggle((toggle) =>
                toggle
                    .setTooltip(t("Patch default color"))
                    .setValue(this.plugin.settings.rainbow_line)
                    .onChange(async (value) => {
                        this.plugin.settings.rainbow_line = value;
                        store.rainbowLine = value;
                        this.plugin.saveSettings();
                    }),
            )
            .addColorPicker((color) =>
                color
                    .setValue(this.plugin.settings.rainbow_color_1)
                    .onChange(async (value) => {
                        this.plugin.settings.rainbow_color_1 = value;
                        store.rainbowColor1 = value;
                        this.plugin.saveSettings();
                    }),
            )
            .addColorPicker((color) =>
                color
                    .setValue(this.plugin.settings.rainbow_color_2)
                    .onChange(async (value) => {
                        this.plugin.settings.rainbow_color_2 = value;
                        store.rainbowColor2 = value;
                        this.plugin.saveSettings();
                    }),
            )
            .addColorPicker((color) =>
                color
                    .setValue(this.plugin.settings.rainbow_color_3)
                    .onChange(async (value) => {
                        this.plugin.settings.rainbow_color_3 = value;
                        store.rainbowColor3 = value;
                        this.plugin.saveSettings();
                    }),
            )
            .addColorPicker((color) =>
                color
                    .setValue(this.plugin.settings.rainbow_color_4)
                    .onChange(async (value) => {
                        this.plugin.settings.rainbow_color_4 = value;
                        store.rainbowColor4 = value;
                        this.plugin.saveSettings();
                    }),
            )
            .addColorPicker((color) =>
                color
                    .setValue(this.plugin.settings.rainbow_color_5)
                    .onChange(async (value) => {
                        this.plugin.settings.rainbow_color_5 = value;
                        store.rainbowColor5 = value;
                        this.plugin.saveSettings();
                    }),
            );

        // New Font Settings
        new Setting(container)
            .setName(t("Font Size"))
            .setDesc(t("Custom font size for outline text (e.g., 14px, 1rem)"))
            .addText((text) =>
                text
                    .setPlaceholder("inherit")
                    .setValue(this.plugin.settings.font_size)
                    .onChange(async (value) => {
                        this.plugin.settings.font_size = value;
                        store.fontSize = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(container)
            .setName(t("Font Family"))
            .setDesc(t("Custom font family for outline text"))
            .addText((text) =>
                text
                    .setPlaceholder("inherit")
                    .setValue(this.plugin.settings.font_family)
                    .onChange(async (value) => {
                        this.plugin.settings.font_family = value;
                        store.fontFamily = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(container)
            .setName(t("Font Weight"))
            .setDesc(t("Custom font weight for outline text (e.g., normal, bold, 400, 700)"))
            .addText((text) =>
                text
                    .setPlaceholder("inherit")
                    .setValue(this.plugin.settings.font_weight)
                    .onChange(async (value) => {
                        this.plugin.settings.font_weight = value;
                        store.fontWeight = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(container)
            .setName(t("Line Height"))
            .setDesc(t("Custom line height for outline text (e.g., 1.5, 2)"))
            .addText((text) =>
                text
                    .setPlaceholder("inherit")
                    .setValue(this.plugin.settings.line_height)
                    .onChange(async (value) => {
                        this.plugin.settings.line_height = value;
                        store.lineHeight = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(container)
            .setName(t("Line Gap"))
            .setDesc(t("Custom gap between lines (e.g., 4px, 0.5rem)"))
            .addText((text) =>
                text
                    .setPlaceholder("inherit")
                    .setValue(this.plugin.settings.line_gap)
                    .onChange(async (value) => {
                        this.plugin.settings.line_gap = value;
                        store.lineGap = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Font Color Settings
        new Setting(container)
            .setName(t("Custom Font Color"))
            .setDesc(t("Enable custom font colors for different heading levels"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.custom_font_color)
                    .onChange(async (value) => {
                        this.plugin.settings.custom_font_color = value;
                        store.customFontColor = value;
                        await this.plugin.saveSettings();
                        // Refresh the display to show/hide color pickers
                        this.display();
                    }),
            );

        if (this.plugin.settings.custom_font_color) {
            new Setting(container)
                .setName(t("H1 Color"))
                .addColorPicker((color) =>
                    color
                        .setValue(this.plugin.settings.h1_color)
                        .onChange(async (value) => {
                            this.plugin.settings.h1_color = value;
                            store.h1Color = value;
                            await this.plugin.saveSettings();
                        }),
                );

            new Setting(container)
                .setName(t("H2 Color"))
                .addColorPicker((color) =>
                    color
                        .setValue(this.plugin.settings.h2_color)
                        .onChange(async (value) => {
                            this.plugin.settings.h2_color = value;
                            store.h2Color = value;
                            await this.plugin.saveSettings();
                        }),
                );

            new Setting(container)
                .setName(t("H3 Color"))
                .addColorPicker((color) =>
                    color
                        .setValue(this.plugin.settings.h3_color)
                        .onChange(async (value) => {
                            this.plugin.settings.h3_color = value;
                            store.h3Color = value;
                            await this.plugin.saveSettings();
                        }),
                );

            new Setting(container)
                .setName(t("H4 Color"))
                .addColorPicker((color) =>
                    color
                        .setValue(this.plugin.settings.h4_color)
                        .onChange(async (value) => {
                            this.plugin.settings.h4_color = value;
                            store.h4Color = value;
                            await this.plugin.saveSettings();
                        }),
                );

            new Setting(container)
                .setName(t("H5 Color"))
                .addColorPicker((color) =>
                    color
                        .setValue(this.plugin.settings.h5_color)
                        .onChange(async (value) => {
                            this.plugin.settings.h5_color = value;
                            store.h5Color = value;
                            await this.plugin.saveSettings();
                        }),
                );

            new Setting(container)
                .setName(t("H6 Color"))
                .addColorPicker((color) =>
                    color
                        .setValue(this.plugin.settings.h6_color)
                        .onChange(async (value) => {
                            this.plugin.settings.h6_color = value;
                            store.h6Color = value;
                            await this.plugin.saveSettings();
                        }),
                );
        }
    }
}

export { SettingTab, DEFAULT_SETTINGS };
export type { QuietOutlineSettings };
