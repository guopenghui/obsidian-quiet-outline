import zh from "./locale/zh";
import en from "./locale/en";
import zhTW from "./locale/zh-TW";
import { getLanguage } from "obsidian";

const localeMap: { [k: string]: Partial<typeof en>; } = {
    en,
    zh,
    "zh-TW": zhTW,
};


const lang = getLanguage();
const locale = localeMap[lang || "en"];

export function t(text: keyof typeof en): string {
    return (locale && locale[text]) || en[text];
}
