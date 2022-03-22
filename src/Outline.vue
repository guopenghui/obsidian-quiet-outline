<template>
<div id="container">
    <NConfigProvider :theme="theme">
        <div class="function-bar">
            <NButton size="small" circle type="success" @click="store.activeView()">
                <template #icon>
                    <Icon><SettingsBackupRestoreRound/></Icon>
                </template>
            </NButton>
            <NInput v-model:value="pattern" placeholder="Input to search" />
        </div>
        <NTree
            style="--n-node-text-color:var(--text-normal)"
            block-line
            :pattern="pattern"
            :data="data2"
            :on-update:selected-keys="jump"
            :render-label="renderMethod"
        />
    </NConfigProvider>
</div>
</template>

<script setup lang="ts">
import {ref, computed, createStaticVNode} from 'vue'
import { Notice, MarkdownView, sanitizeHTMLToDom, HeadingCache } from 'obsidian'
import { NTree, TreeOption, NButton, NInput, NConfigProvider, darkTheme } from 'naive-ui'
import { Icon } from '@vicons/utils'
import { SettingsBackupRestoreRound } from '@vicons/material'
import { marked } from 'marked'

import { formula, internal_link, remove_href } from './parser'
import { store } from './store'


// load settings
let renderMethod = computed(() => {
    if(store.plugin.settings.markdown){
        return renderLabel
    }
    return null
})

// search
let pattern =ref("")

// toggle light/dark theme
let theme = computed(() => {
    if(store.dark){
        return darkTheme
    }
    return null
})

// click and jump
async function jump(_selected:any, nodes:TreeOption[] ): Promise<number> {
    if(nodes[0] === undefined){
        return
    }

    const key: number = nodes[0].key as number  
    let to_line: number = store.headers[key].position.start.line
    
    const view = store.plugin.app.workspace.getActiveViewOfType(MarkdownView)
    if(view) {
        const current_view = view.currentMode
        to_line = to_line > 1? to_line-2 : 0
        current_view.applyScroll(to_line)
        // make jump more precisely
        setTimeout(()=>{current_view.applyScroll(to_line)},500)
    }
}

// prepare data for tree component
let data2 = computed(()=>{
    return makeTree(store.headers)
})

function makeTree(headers: HeadingCache[]): TreeOption[] {

    let tree: TreeOption[] = arrToTree(headers)
    return tree
}

function arrToTree(headers: HeadingCache[]): TreeOption[] {
    const root: TreeOption = {children:[]}
    const stack = [{node: root, level: -1}]

    headers.forEach((h,i)=>{
        let node: TreeOption = {
                label: h.heading,
                key: i,
                line: h.position.start.line,
            }

        while(h.level <= stack.last().level){
            stack.pop()            
        }
        
        let parent = stack.last().node
        if(parent.children === undefined){
            parent.children = []
        }

        parent.children.push(node)
        stack.push({node, level: h.level})
    })

    return root.children
}


// render markdown
marked.use({ extensions: [formula, internal_link] })
marked.use({ walkTokens: remove_href })

function renderLabel({ option }: { option: TreeOption }) {
    const sanitized = sanitizeHTMLToDom(`<div>${option.label}</div>`).children[0].innerHTML
    let result = marked.parse(sanitized).trim()
    
    result = `<div>${result}</div>`

    return createStaticVNode(result,1)
}

</script>


<style>
</style>
