import {App, CachedMetadata} from "obsidian";

// a trick to use obsidian builtin function to parse markdown headings
export async function parseMetaDataCache(app: App, text: string): Promise<CachedMetadata> {
    // @ts-ignore
    const res = await app.internalPlugins.plugins['canvas']._children[0].parseText(text)
    return res;
}

export {}