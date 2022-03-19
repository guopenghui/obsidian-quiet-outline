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
import { Notice, MarkdownView } from 'obsidian'
import { NTree, TreeOption, NButton, NInput, NConfigProvider, darkTheme } from 'naive-ui'
import { Icon } from '@vicons/utils'
import { SettingsBackupRestoreRound } from '@vicons/material'
import { marked } from 'marked'

import { formula, internal_link, remove_href } from './parser'
import { store, HeadLine } from './store'


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
    await new Promise((resolve) => { resolve(0) })

    if(nodes[0] === undefined){
        return
    }
    const key: number = nodes[0].key as number  
    let to_line: number = store.headers[key].line
    
    const view = store.plugin.app.workspace.getActiveViewOfType(MarkdownView)
    if(view) {
        const current_view = view.currentMode
        to_line = to_line > 1? to_line-2 : 0
        current_view.applyScroll(to_line)
    }
}

// prepare data for tree component
let data2 = computed(()=>{
    return makeTree(store.headers)
})


interface Head {
    level: number,
    head: string,
    line: number,
}

function makeTree(headers: HeadLine[]): TreeOption[] {
    const head_names: Head[] = headers.map((s)=>{
        let v = s.text.split(" ")

        const level = v[0].length
        const head = v.slice(1).join(" ")

        return {level, head, line: s.line}
    })

    let tree: TreeOption[] = strsToTree(head_names)
    return tree
}

function strsToTree(head: Head[]): TreeOption[] {
    const root: TreeOption = {children:[]}
    const stack = [{node: root, level: -1}]

    head.forEach((h,i)=>{
        let node: TreeOption = {
                label: h.head,
                key: i,
                line: h.line,
            }

        while(h.level <= stack.last().level){
            stack.pop()            
        }
        
        let parent = stack.last().node
        if(parent.children === undefined){
            parent.children = []
        }

        parent.children.push(node)
        stack.push({node, level:h.level})
    })

    return root.children
}


// render markdown
marked.use({ extensions: [formula, internal_link] })
marked.use({ walkTokens: remove_href })

function renderLabel({ option }: { option: TreeOption }) {
    let result = marked.parse(option.label).trim()
    
    result = securityCheck(result)

    result = `<div>${result}</div>`
    return createStaticVNode(result,1)
}

function securityCheck(html: string): string {
    if(/<script.*>/.test(html)) {
         return `<p style="color:red;background-color:yellow;">
                    Script is not permitted.
                </p>`
    }
    return html
}

</script>


<style>
</style>
