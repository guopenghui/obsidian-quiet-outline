import type { SupportedIcon } from "@/store";
import type { TreeOption } from "naive-ui";

export type TreeOptionX = TreeOption & {
    no?: number;
    icon?: SupportedIcon;
    parent?: TreeOptionX;
    children?: TreeOptionX[];
};
