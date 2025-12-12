import { App, debounce } from "obsidian";

export class DataManager {
    private cache: Record<string, any> = {};
    constructor(private app: App, private pluginPath: string) { }

    private async checkPath(normalizedPath: string) {
        const parent = normalizedPath.split("/").slice(0, -1).join("/");
        if (!await this.app.vault.adapter.exists(parent)) {
            await this.app.vault.createFolder(parent);
        }
    }

    private async writeFileDirectly(path: string, content: string) {
        await this.checkPath(path);
        await this.app.vault.adapter.write(path, content);
    }

    getData<Data>(path: string): Data | undefined {
        if (this.cache[path]) {
            return this.cache[path];
        }
    }

    async loadFileData<Data>(path: string, defaultData: Data): Promise<Data> {
        let filePath = [this.pluginPath, path].join("/");

        const fileExist = await this.app.vault.adapter.exists(filePath);
        if (!fileExist) {
            await this.writeFileDirectly(filePath, JSON.stringify(defaultData, null, 2));
            this.cache[path] = defaultData;
            return defaultData;
        }

        let data = await this.app.vault.adapter.read(filePath);
        this.cache[path] = JSON.parse(data);
        return this.cache[path];
    }

    saveFileData = debounce<[string, any], void>(this._saveFileData.bind(this), 200, true);
    async _saveFileData<Data>(path: string, data: Data) {
        this.cache[path] = data;
        let filePath = [this.pluginPath, path].join("/");
        await this.app.vault.adapter.write(filePath, JSON.stringify(data, null, 2));
    }
}
