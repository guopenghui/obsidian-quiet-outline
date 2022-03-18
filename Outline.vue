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


// 设置
let renderMethod = computed(() => {
    if(store.plugin.settings.markdown){
        return renderLabel
    }
    return null
})

// 搜索
let pattern =ref("")

// light/dark 模式切换
let theme = computed(() => {
    if(store.dark){
        return darkTheme
    }
    return null
})

// 页内跳转
function jump(_selected:any, nodes:TreeOption[] ): Promise<number> {
    // new Notice("Jump!")
    return new Promise((resolve, reject) =>{
        if(nodes[0] === undefined){
            resolve(0)
        }
        const key: number = nodes[0].key as number  
        let to_line: number = store.headers[key].line
        
        const view = store.plugin.app.workspace.getActiveViewOfType(MarkdownView)
        if(view) {
            const current_view = view.currentMode
            to_line -= 1
            to_line = to_line > 0? to_line : 0
            current_view.applyScroll(to_line)
        }
        resolve(0)
    })
}

// 准备数据
let data2 = computed(()=>{
    return makeTree(store.headers)
})


interface Head {
    level: number,
    head: string,
    line: number,
}

function makeTree(headers:HeadLine[]):TreeOption[] {
    const head_names: Head[] = headers.map((s)=>{
        let v = s.text.split(" ")
        const sharps = v[0].length
        const head = v.slice(1).join(" ")
        return {level: sharps, head: head, line: s.line}
    })

    let tree: TreeOption[] = strs_to_tree(head_names)
    return tree
}

function strs_to_tree(head: Head[]): TreeOption[] {
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


marked.use({extensions: [formula, internal_link]})
marked.use({walkTokens: remove_href})

// markdown渲染
function renderLabel({option}:{option:TreeOption}){
    let result = marked.parse(option.label).trim()
    result = `<div>${result}</div>`
    return createStaticVNode(result,1)
}

</script>


<style>
</style>
