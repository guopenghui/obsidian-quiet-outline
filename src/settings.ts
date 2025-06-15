import { App, PluginSettingTab, Setting } from "obsidian";
import { QuietOutline } from "./plugin";
import { store } from "./store";
import { t } from "./lang/helper";

interface QuietOutlineSettings {
    patch_color: boolean;
    primary_color_light: string;
    primary_color_dark: string;
    rainbow_line: boolean;
    rainbow_color_1: string;
    rainbow_color_2: string;
    rainbow_color_3: string;
    rainbow_color_4: string;
    rainbow_color_5: string;
    search_support: boolean;
    level_switch: boolean;
    markdown: boolean;
    expand_level: string;
    hide_unsearched: boolean;
    auto_expand_ext: "only-expand" | "expand-and-collapse-rest-to-default" | "expand-and-collapse-rest-to-setting" | "disable";
    // sync_with_markdown: string;
    regex_search: boolean;
    ellipsis: boolean;
    label_direction: "top" | "bottom" | "left" | "right";
    drag_modify: boolean;
    locate_by_cursor: boolean;
    // show_popover: boolean;
    show_popover_key: "ctrlKey" | "altKey" | "metaKey" | "disable";
    remember_state: boolean;
	keep_search_input: boolean;
    export_format: string;
	lang_direction_decide_by: "system" | "text";
	auto_scroll_into_view: boolean;
}

const DEFAULT_SETTINGS: QuietOutlineSettings = {
    patch_color: true,
    primary_color_light: "#18a058",
    primary_color_dark: "#63e2b7",
    rainbow_line: false,
    rainbow_color_1: "#FD8B1F",
    rainbow_color_2: "#FFDF00",
    rainbow_color_3: "#07EB23",
    rainbow_color_4: "#2D8FF0",
    rainbow_color_5: "#BC01E2",
    search_support: true,
    level_switch: true,
    markdown: true,
    expand_level: "0",
    hide_unsearched: true,
    auto_expand_ext: "only-expand",
    // sync_with_markdown: "none",
    regex_search: false,
    ellipsis: false,
    label_direction: "left",
    drag_modify: false,
    locate_by_cursor: false,
    show_popover_key: "ctrlKey",
    remember_state: true,
	keep_search_input: false,
    export_format: "{title}",
    lang_direction_decide_by: "system",
    auto_scroll_into_view: true,
};

class SettingTab extends PluginSettingTab {
    plugin: QuietOutline;

    constructor(app: App, plugin: QuietOutline) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: t('Settings for Quiet Outline.') });

        new Setting(containerEl)
            .setName(t("Set Primary Color"))
            .addToggle(toggle => toggle
                .setTooltip(t("Patch default color"))
                .setValue(this.plugin.settings.patch_color)
                .onChange(async (value) => {
                    this.plugin.settings.patch_color = value;
                    store.patchColor = value;
                    this.plugin.saveSettings();
                })
            )
            .addColorPicker(color => color
                .setValue(this.plugin.settings.primary_color_light)
                .onChange(async (value) => {
                    this.plugin.settings.primary_color_light = value;
                    store.primaryColorLight = value;
                    this.plugin.saveSettings();
                })
            )
            .addColorPicker(color => color
                .setValue(this.plugin.settings.primary_color_dark)
                .onChange(async (value) => {
                    this.plugin.settings.primary_color_dark = value;
                    store.primaryColorDark = value;
                    this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName(t("Set Rainbow Line Color"))
            .addToggle(toggle => toggle
                .setTooltip(t("Patch default color"))
                .setValue(this.plugin.settings.rainbow_line)
                .onChange(async (value) => {
                    this.plugin.settings.rainbow_line = value;
                    store.rainbowLine = value;
                    this.plugin.saveSettings();
                })
            )
            .addColorPicker(color => color
                .setValue(this.plugin.settings.rainbow_color_1)
                .onChange(async (value) => {
                    this.plugin.settings.rainbow_color_1 = value;
                    store.rainbowColor1 = value;
                    this.plugin.saveSettings();
                })
            )
            .addColorPicker(color => color
                .setValue(this.plugin.settings.rainbow_color_2)
                .onChange(async (value) => {
                    this.plugin.settings.rainbow_color_2 = value;
                    store.rainbowColor2 = value;
                    this.plugin.saveSettings();
                })
            )
            .addColorPicker(color => color
                .setValue(this.plugin.settings.rainbow_color_3)
                .onChange(async (value) => {
                    this.plugin.settings.rainbow_color_3 = value;
                    store.rainbowColor3 = value;
                    this.plugin.saveSettings();
                })
            )
            .addColorPicker(color => color
                .setValue(this.plugin.settings.rainbow_color_4)
                .onChange(async (value) => {
                    this.plugin.settings.rainbow_color_4 = value;
                    store.rainbowColor4 = value;
                    this.plugin.saveSettings();
                })
            )
            .addColorPicker(color => color
                .setValue(this.plugin.settings.rainbow_color_5)
                .onChange(async (value) => {
                    this.plugin.settings.rainbow_color_5 = value;
                    store.rainbowColor5 = value;
                    this.plugin.saveSettings();
                })
            );


        new Setting(containerEl)
            .setName(t('Render Markdown'))
            .setDesc(t('Render heading string as markdown format.'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.markdown)
                .onChange(async (value) => {
                    this.plugin.settings.markdown = value;
                    store.markdown = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName(t('Ellipsis'))
            .setDesc(t('Keep one line per heading'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.ellipsis)
                .onChange(async (value) => {
                    this.plugin.settings.ellipsis = value;
                    store.ellipsis = value;
                    await this.plugin.saveSettings();
                    store.refreshTree();
                    this.display();
                })
            );

        if (this.plugin.settings.ellipsis) {
            new Setting(containerEl)
                .setName(t("Tooltip direction"))
                .addDropdown(level => level
                    .addOption("left", "Left")
                    .addOption("right", "Right")
                    .addOption("top", "Top")
                    .addOption("bottom", "Bottom")
                    .setValue(this.plugin.settings.label_direction)
                    .onChange(async (value: "top" | "bottom" | "left" | "right") => {
                        this.plugin.settings.label_direction = value;
                        store.labelDirection = value;
                        await this.plugin.saveSettings();
                        store.refreshTree();
                    })
                );
        }

        new Setting(containerEl)
            .setName(t("Search Support"))
            .setDesc(t("Add a searching area on the top"))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.search_support)
                .onChange(async (value) => {
                    this.plugin.settings.search_support = value;
                    store.searchSupport = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName(t("Level Switch"))
            .setDesc(t("Expand headings to certain level."))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.level_switch)
                .onChange(async (value) => {
                    this.plugin.settings.level_switch = value;
                    store.levelSwitch = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName(t("Default Level"))
            .setDesc(t("Default expand level when opening a new note."))
            .addDropdown(level => level
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
                })
            );

        new Setting(containerEl)
            .setName(t("Hide Unsearched"))
            .setDesc(t("Hide irrelevant headings when searching"))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hide_unsearched)
                .onChange(async (value) => {
                    this.plugin.settings.hide_unsearched = value;
                    store.hideUnsearched = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName(t("Regex Search"))
            .setDesc(t("Search headings using regular expression"))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.regex_search)
                .onChange(async (value) => {
                    this.plugin.settings.regex_search = value;
                    store.regexSearch = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName(t("Auto Expand"))
            .setDesc(t("Auto expand and collapse headings when scrolling and cursor position change"))
            .addDropdown(mode => mode
                .addOption("only-expand", t("Only Expand"))
                .addOption("expand-and-collapse-rest-to-default", t("Expand and Collapse Rest to Default"))
                .addOption("expand-and-collapse-rest-to-setting", t("Expand and Collapse Rest to Setting Level (Level Switch)"))
                .addOption("disable", t("Disabled"))
                .setValue(this.plugin.settings.auto_expand_ext)
                .onChange(async (value: "only-expand" | "expand-and-collapse-rest-to-default" | "expand-and-collapse-rest-to-setting" | "disable") => {
                    this.plugin.settings.auto_expand_ext= value;
                    await this.plugin.saveSettings();
                })
            );
        
        new Setting(containerEl)
            .setName(t("Auto Scroll Into View"))
            .setDesc(t("Auto scroll located heading into view"))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.auto_scroll_into_view)
                .onChange(async (value) => {
                    this.plugin.settings.auto_scroll_into_view = value;
                    await this.plugin.saveSettings();
                })
            );
            
        new Setting(containerEl)
            .setName(t("Locate By Cursor"))
            .setDesc(t("Highlight and Auto expand postion will be determined by cursor position"))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.locate_by_cursor)
                .onChange(async (value) => {
                    this.plugin.settings.locate_by_cursor = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName(t("Show Popover on hover"))
            .setDesc(t("Press functional key and move cursor to heading"))
            .addDropdown(funcKey => funcKey
                .addOption("ctrlKey", "Ctrl")
                .addOption("altKey", "Alt")
                .addOption("metaKey", "Meta")
                .addOption("disable", t("Disable"))
                .setValue(this.plugin.settings.show_popover_key)
                .onChange(async (value: "ctrlKey" | "altKey" | "metaKey" | "disable") => {
                    this.plugin.settings.show_popover_key= value;
                    await this.plugin.saveSettings();
                })
            );
            
        new Setting(containerEl)
            .setName(t("Remember States"))
            .setDesc(t("Remember expanded/collapsed state of headings of opened notes"))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.remember_state)
                .onChange(async (value) => {
                    this.plugin.settings.remember_state = value;
                    await this.plugin.saveSettings();
                })
            );
        
        new Setting(containerEl)
            .setName(t("Keep Search Input"))
            .setDesc(t("Keep search input when switching between notes"))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.keep_search_input)
                .onChange(async (value) => {
                    this.plugin.settings.keep_search_input = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName(t("Drag headings to modify note"))
            .setDesc(t("❗ This will modify note content, be careful."))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.drag_modify)
                .onChange(async (value) => {
                    this.plugin.settings.drag_modify = value;
                    store.dragModify = value;
                    await this.plugin.saveSettings();
                })
            );
        
        new Setting(containerEl)
            .setName(t("Text Direction"))
            .setDesc(t("is decided by"))
            .addDropdown(what => what
                .addOption("system", "Obsidian Language")
                .addOption("text", "Specific text of heading")
                .setValue(this.plugin.settings.lang_direction_decide_by)
                .onChange(async (value: "system" | "text") => {
                    this.plugin.settings.lang_direction_decide_by = value;
                    store.textDirectionDecideBy = value;
                    await this.plugin.saveSettings();
                    store.refreshTree();
                })
            );
			
		new Setting(containerEl)
			.setName(t("Export Format"))
			.addText(text => text
				.setValue(this.plugin.settings.export_format)
				.onChange(async (value) => {
					this.plugin.settings.export_format = value
					await this.plugin.saveSettings()	
				})
				.inputEl.setAttribute("style", "width: 100%;")
			)
			.addExtraButton(button => button
				.setIcon("help")
				.setTooltip("release doc 0.3.32")
				.onClick(() => window.open("https://github.com/guopenghui/obsidian-quiet-outline/releases/tag/0.3.32"))
			)

        // new Setting(containerEl)
        //     .setName("Sync With Markdown")
        //     .setDesc("Sync fold state with Markdown")
        //     .addDropdown(drop => drop
        //         .addOption("none", "No sync")
        //         .addOption("bidirectional", "Bidirectional")
        //         .addOption("outline-to-markdown", "Outline To Markdown")
        //         .setValue(this.plugin.settings.sync_with_markdown)
        //         .onChange(async (value) => {
        //             store.plugin.settings.sync_with_markdown = value
        //             await this.plugin.saveSettings()
        //         })
        //     )
    }
}


export { SettingTab, DEFAULT_SETTINGS };
export type { QuietOutlineSettings };
