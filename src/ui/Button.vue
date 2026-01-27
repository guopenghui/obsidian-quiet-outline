<template>
    <NButton size="small" circle @click="onClick" :aria-label="label">
        <template #icon>
            <Icon>
                <svgIcon :style="iconStyle" />
            </Icon>
        </template>
    </NButton>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import { NButton } from "naive-ui";
import { Icon } from "@vicons/utils";

const { iconStyle, onClick, label, svgIcon } = defineProps<{
    iconStyle: unknown;
    onClick: () => void;
    label: string;
    svgIcon: Component;
}>();
</script>
