import { App, type Debouncer, debounce } from "obsidian";
import { tryParseJson } from "./helper";

export const DEFAULT_SAVE_DELAY_SECONDS = 0.2;

const DEFAULT_SAVE_DELAY_MS = DEFAULT_SAVE_DELAY_SECONDS * 1000;

export function normalizeSaveDelaySeconds(value: unknown): number {
    if (value === "" || value === null || value === undefined) {
        return DEFAULT_SAVE_DELAY_SECONDS;
    }

    const delay = Number(value);
    if (!Number.isFinite(delay)) {
        return DEFAULT_SAVE_DELAY_SECONDS;
    }

    return Math.max(0, delay);
}

export function saveDelaySecondsToMs(delaySeconds: unknown): number {
    return Math.round(normalizeSaveDelaySeconds(delaySeconds) * 1000);
}

function normalizeSaveDelayMs(saveDelayMs: number): number {
    if (!Number.isFinite(saveDelayMs)) {
        return DEFAULT_SAVE_DELAY_MS;
    }

    return Math.max(0, saveDelayMs);
}

export class DataManager {
    private cache: Record<string, unknown> = {};
    private writeQueue: Promise<void> = Promise.resolve();
    private saveFileDataDebounced: Debouncer<[string, unknown], void>;

    constructor(
        private app: App,
        private pluginPath: string,
        private saveDelayMs: number = DEFAULT_SAVE_DELAY_MS,
    ) {
        this.saveDelayMs = normalizeSaveDelayMs(saveDelayMs);
        this.saveFileDataDebounced = this.createSaveFileDataDebouncer();
    }

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
            return this.cache[path] as Data;
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
        this.cache[path] = tryParseJson(data, defaultData);
        return this.cache[path] as Data;
    }

    private createSaveFileDataDebouncer() {
        return debounce<[string, unknown], void>(
            this._saveFileData.bind(this),
            this.saveDelayMs,
            true,
        );
    }

    async setSaveDelayMs(saveDelayMs: number) {
        await this.flush();
        this.saveDelayMs = normalizeSaveDelayMs(saveDelayMs);
        this.saveFileDataDebounced = this.createSaveFileDataDebouncer();
    }

    cancelPendingSave() {
        this.saveFileDataDebounced.cancel();
    }

    saveFileData<Data>(path: string, data: Data) {
        if (this.saveDelayMs === 0) {
            this._saveFileData(path, data);
            return;
        }

        this.saveFileDataDebounced(path, data);
    }

    async flush() {
        this.saveFileDataDebounced.run();
        await this.writeQueue;
    }

    _saveFileData<Data>(path: string, data: Data) {
        this.cache[path] = data;
        let filePath = [this.pluginPath, path].join("/");
        this.writeQueue = this.writeQueue
            .then(() => this.app.vault.adapter.write(filePath, JSON.stringify(data, null, 2)))
            .catch((error) => console.error(`Failed to save data to ${filePath}: ${error}`));
    }
}
