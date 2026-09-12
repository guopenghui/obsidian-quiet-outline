<template>
    <div style="display: contents" v-html="html"></div>
</template>

<script setup lang="ts">
import { getIcon } from "obsidian";
import { computed } from "vue";

const props = defineProps({
    id: {
        type: String,
        default: "ghost",
    },
});

const html = computed(() => getIcon(props.id)?.outerHTML || getIcon("ghost")?.outerHTML);
</script>
