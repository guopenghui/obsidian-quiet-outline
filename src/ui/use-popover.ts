import QuietOutline from "@/plugin";
import { onMounted, onUnmounted } from "vue";

export function useOutlinePopover(plugin: QuietOutline, container: HTMLElement) {
    // on Mouseover, show popover
    let triggerNode: HTMLElement | undefined;
    let mouseEvent: MouseEvent | undefined;
    let prevShowed = "";

    function onMouseEnter(event: MouseEvent) {
        const target = event.target as HTMLElement;

        const node = target.closest(".n-tree-node") as HTMLElement;
        if (!node) {
            return;
        }
        triggerNode = node;
        mouseEvent = event;
        addEventListener("keydown", openPopover);
    }

    function onMouseLeave(_event: MouseEvent) {
        removeEventListener("keydown", openPopover);
    }

    const funcKeyPressed = (event: KeyboardEvent): boolean => {
        return (
            (plugin.settings.show_popover_key === "ctrlKey" && event.ctrlKey) ||
            (plugin.settings.show_popover_key === "altKey" && event.altKey) ||
            (plugin.settings.show_popover_key === "metaKey" && event.metaKey)
        );
    };

    function _openPopover(e: KeyboardEvent) {
        if (funcKeyPressed(e)) {
            plugin.app.workspace.trigger("hover-link", {
                event: mouseEvent,
                source: "preview",
                targetEl: triggerNode,
                hoverParent: { hoverPopover: null },
                linktext: "#" + triggerNode?.getAttribute("raw"),
                sourcePath: plugin.navigator.getPath(),
            });
        }
    }

    const openPopover = customDebounce(_openPopover, 100);

    // excute on first time, and wait until next fresh
    // ... or take a break when node pointed changes
    function customDebounce(func: (_: any) => void, delay: number) {
        let fresh = true;
        let timeoutId: any;

        return function (this: any, ...args: any) {
            const currentLink = triggerNode?.getAttribute("raw") || "";
            if (currentLink !== prevShowed || fresh) {
                func.apply(this, args);

                fresh = false;
                prevShowed = currentLink;
                return;
            }

            // 如果已经设置了定时器，清除之前的定时器
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // 设置新的定时器
            timeoutId = setTimeout(() => {
                fresh = true;
            }, delay);
        };
    }

    onMounted(() => {
        container.addEventListener("mouseover", onMouseEnter);
        container.addEventListener("mouseout", onMouseLeave);
    });

    onUnmounted(() => {
        container.removeEventListener("mouseover", onMouseEnter);
        container.removeEventListener("mouseout", onMouseLeave);
        removeEventListener("keydown", openPopover);
    });
}
