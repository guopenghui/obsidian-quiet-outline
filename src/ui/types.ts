import type { SupportedIcon } from "@/store";
import type { TreeOption } from "naive-ui";

export type TreeOptionX = TreeOption & {
    no?: number;
    icon?: SupportedIcon;
    prefixText?: string;
    parent?: TreeOptionX;
    children?: TreeOptionX[];
};
