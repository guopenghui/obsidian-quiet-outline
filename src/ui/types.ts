import { SupportedIcon } from "@/store";
import { TreeOption } from "naive-ui";

export type TreeOptionX = TreeOption & {
    no?: number;
    icon?: SupportedIcon;
    parent?: TreeOptionX;
    children?: TreeOptionX[];
};
