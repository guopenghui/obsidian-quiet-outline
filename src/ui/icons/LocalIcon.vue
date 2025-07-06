<template>
    <div v-html="html"></div>
</template>

<script setup lang="ts">
import { getIcon } from "obsidian"

const props = defineProps({
    id: {
        type: String,
        default: 'ghost'
    }
});

const html = getIcon(props.id)?.outerHTML || getIcon('ghost')?.outerHTML;

</script>
