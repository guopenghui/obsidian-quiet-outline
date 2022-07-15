import { App, PluginSettingTab, Setting } from "obsidian"
import { QuietOutline } from "./plugin";
import { store } from "./store"
import { t } from "./lang/helper"
interface QuietOutlineSettings {
    search_support: boolean;
    level_switch: boolean;
    markdown: boolean;
    expand_level: string;
    hide_unsearched: boolean;
    auto_expand: boolean;
    // sync_with_markdown: string;
    regex_search: boolean;
}

const DEFAULT_SETTINGS: QuietOutlineSettings = {
    search_support: true,
    level_switch: true,
    markdown: true,
    expand_level: "0",
    hide_unsearched: true,
    auto_expand: true,
    // sync_with_markdown: "none",
    regex_search: false,
}

class SettingTab extends PluginSettingTab {
    plugin: QuietOutline;

    constructor(app: App, plugin: QuietOutline) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty()
        containerEl.createEl('h2', { text: t('Settings for Quiet Outline.') })

        new Setting(containerEl)
            .setName(t('Render Markdown'))
            .setDesc(t('Render heading string as markdown format.'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.markdown)
                .onChange(async (value) => {
                    store.plugin.settings.markdown = value
                    await this.plugin.saveSettings();
                })
            )

        new Setting(containerEl)
            .setName(t("Search Support"))
            .setDesc(t("Add a searching area on the top"))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.search_support)
                .onChange(async (value) => {
                    store.plugin.settings.search_support = value
                    await this.plugin.saveSettings()
                })
            )

        new Setting(containerEl)
            .setName(t("Level Switch"))
            .setDesc(t("Expand headings to certain level."))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.level_switch)
                .onChange(async (value) => {
                    store.plugin.settings.level_switch = value
                    await this.plugin.saveSettings()
                })
            )

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
                    store.plugin.settings.expand_level = value
                    await this.plugin.saveSettings()
                })
            )

        new Setting(containerEl)
            .setName(t("Hide Unsearched"))
            .setDesc(t("Hide irrelevant headings when searching"))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hide_unsearched)
                .onChange(async (value) => {
                    store.plugin.settings.hide_unsearched = value
                    await this.plugin.saveSettings()
                })
            )

        new Setting(containerEl)
            .setName(t("Regex Search"))
            .setDesc(t("Search headings using regular expression"))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.regex_search)
                .onChange(async (value) => {
                    store.plugin.settings.regex_search = value
                    await this.plugin.saveSettings()
                })
            )

        new Setting(containerEl)
            .setName(t("Auto Expand"))
            .setDesc(t("Auto expand and collapse headings when scrolling"))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.auto_expand)
                .onChange(async (value) => {
                    store.plugin.settings.auto_expand = value
                    await this.plugin.saveSettings()
                })
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


export { SettingTab, DEFAULT_SETTINGS }
export type { QuietOutlineSettings }