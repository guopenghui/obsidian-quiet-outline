import { onMounted, onBeforeUnmount, unref } from "vue";
import type { Ref } from "vue";
import { eventBus, type EventName, type QuietOutlineEventMap } from "./event-bus";

function useDomEvent<T extends keyof GlobalEventHandlersEventMap>(
    elRef: Ref<EventTarget> | EventTarget,
    type: T,
    listener: (ev: GlobalEventHandlersEventMap[T]) => void,
): void;
function useDomEvent<T extends keyof GlobalEventHandlersEventMap>(
    elRef: Ref<EventTarget> | EventTarget,
    type: T,
    listener: (ev: any) => void,
) {
    onMounted(() => {
        unref(elRef).addEventListener(type, listener);
    });
    onBeforeUnmount(() => {
        unref(elRef).removeEventListener(type, listener);
    });
}

function useEventBus<K extends EventName>(
    name: K,
    handler: (...args: QuietOutlineEventMap[K]) => void
) {
    onMounted(() => {
        eventBus.on(name, handler);
    });
    onBeforeUnmount(() => {
        eventBus.off(name, handler);
    });
}

export { useDomEvent, useEventBus };
