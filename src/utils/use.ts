import { onMounted, onBeforeUnmount, unref } from "vue";
import type { Ref } from "vue";

interface EventMap extends GlobalEventHandlersEventMap {
    "quiet-outline-levelchange": CustomEvent<{
        level: string | number;
    }>;
}

function useEvent<T extends keyof EventMap>(
    elRef: Ref<EventTarget> | EventTarget,
    type: T,
    listener: (ev: EventMap[T]) => void,
) {
    onMounted(() => {
        unref(elRef).addEventListener(type, listener);
    });
    onBeforeUnmount(() => {
        unref(elRef).removeEventListener(type, listener);
    });
}

export { useEvent };
