import { onMounted } from "vue";
import type { QuietOutline } from "@/plugin";
import { store } from "@/store";
import { TreeDropInfo } from "naive-ui";
import { nodeToIndex } from "./utils";

export function useOutlineDnd(container: HTMLElement, plugin: QuietOutline) {
    onMounted(() => {
        container.addEventListener("dragstart", (e) => {
            if (!plugin.navigator.canDrop) {
                return;
            }

            const target = e.target as HTMLElement;
            if (!target || !target.hasClass("n-tree-node")) {
                return;
            }

            const no = parseInt(target.id.slice(3));
            const heading = store.headers[no];

            e.dataTransfer?.setData("text/plain", heading.heading);
            // @ts-ignore
            plugin.app.dragManager.onDragStart(e, {
                source: "outline",
                type: "heading",
                icon: "heading-glyph",
                title: heading.heading,
                heading,
                // @ts-ignore
                // currently only markdownNav allows drop, and its view exists
                file: plugin.navigator.view.file,
            });
        });
    });

    // drag and drop
    async function onDrop({ node, dragNode, dropPosition }: TreeDropInfo) {
        if (!plugin.navigator.canDrop) {
            return;
        }

        const fromNo =  nodeToIndex(dragNode);
        const toNo =  nodeToIndex(node);

        await plugin.navigator.handleDrop(fromNo, toNo, dropPosition);
    }

    return {
        onDrop,
    };
}
