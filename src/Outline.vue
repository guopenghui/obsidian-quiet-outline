<template>
<div id="container">
    <NConfigProvider :theme="theme">
        <div class="function-bar">
            <NButton size="small" circle type="success" @click="reset">
                <template #icon>
                    <Icon><SettingsBackupRestoreRound/></Icon>
                </template>
            </NButton>
            <NInput v-model:value="pattern" placeholder="Input to search" />
        </div>
        <NSlider
            v-if="store.plugin.settings.level_switch"
            v-model:value="level" 
            :marks="marks" step="mark" 
            :min="0" 
            :max="5" 
            style="margin-bottom:8px;"
            :format-tooltip="formatTooltip"/>
        <NTree
            block-line
            :pattern="pattern"
            :data="data2"
            :on-update:selected-keys="jump"
            :render-label="renderMethod"
            :node-props="setAttrs"
            :expanded-keys="expanded"
            :on-update:expanded-keys="expand"
            :key="update_tree"
        />
    </NConfigProvider>
</div>
</template>

<script setup lang="ts">
import {ref, reactive, computed, createStaticVNode, watch, nextTick} from 'vue'
import { Notice, MarkdownView, sanitizeHTMLToDom, HeadingCache } from 'obsidian'
import { NTree, TreeOption, NButton, NInput, NSlider, NConfigProvider, darkTheme } from 'naive-ui'
import { Icon } from '@vicons/utils'
import { SettingsBackupRestoreRound } from '@vicons/material'
import { marked } from 'marked'

import { formula, internal_link, remove_href } from './parser'
import { store } from './store'




// add html attributes to nodes
function setAttrs(info: {option: TreeOption}) {
    let lev = parseInt( (info.option.key as string).split('-')[1] )
    
    return {
        class: "level-" + lev
    }
}

// switch heading expand levels
let level = ref(parseInt(store.plugin.settings.expand_level))

let expanded = ref([])
function expand(keys:string[], option:TreeOption[]) {
    expanded.value = keys;
}

function switchLevel(lev: number) {
    expanded.value = store.headers
        .map((h,i)=>{
            return "item-" + h.level + "-" + i
        })
        .filter((key,i,arr)=>{
            
            const get_level = (k:string):number=> parseInt(k.split('-')[1])
            if(i===arr.length-1) return false
            if(get_level(arr[i]) >= get_level(arr[i+1])) return false
            return  get_level(key) <= lev
        })

}

watch(
    level,
    (cur, prev) => {
        switchLevel(cur)
    }
)

// force remake tree
let update_tree =ref(0)

watch(
    () => store.leaf_change,
    () => {
        const old_level = level.value
        level.value = parseInt(store.plugin.settings.expand_level)
        if(old_level === level.value) {
            switchLevel(level.value)
        }

        update_tree.value++
    }
)


const marks = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
}

function formatTooltip(value: number): string {
    if(value > 0){
        return "h" + value
    }
    return "No expand"
}


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

    const key_value = (nodes[0].key as string).split("-")
    const key = parseInt(key_value[2])
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
                key: "item-" + h.level + "-" + i,
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

// reset button
function reset(){
    store.dark = document.querySelector('body').classList.contains('theme-dark')
    pattern.value = ""
    level.value = parseInt(store.plugin.settings.expand_level)
    switchLevel(level.value)
}

</script>


<style>
</style>
