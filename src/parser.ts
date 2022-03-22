import { marked } from 'marked'
import { renderMath, finishRenderMath, loadMathJax } from 'obsidian'
import { store } from './store'

type Extension = marked.TokenizerExtension & marked.RendererExtension

// parse $xxx$ format
export const formula: Extension = {
    name: "formula",
    level: "inline",
    start(src) {
        return src.match(/\$/)?.index
    },
    tokenizer(src, tokens) {
        const rule = /^\$([^\$]+)\$/
        const match = rule.exec(src)
        if(match) {
            return {
                type: 'formula',
                raw: match[0],
                formula: match[1].trim(),
            }
        }
    },
    renderer(token) {
        try{
            const formula = renderMath(token.formula,false).outerHTML
            finishRenderMath()
            return formula
        } catch {
            loadMathJax().then(()=>{
                store.activeView()
            })
            return false
        }
    }
}

// parse [[xxx]] format
export const internal_link: Extension = {
    name: "internal",
    level: "inline",
    start(src) {
        return src.match(/\[\[/)?.index
    },
    tokenizer(src, token) {
        const rule = /^\[\[([^\[\]]+?)\]\]/
        const match = rule.exec(src)
        if(match){
            return {
                type: "internal",
                raw: match[0],
                internal: match[1],
            }
        }
    },
    renderer(token) {
        return `<span class="internal-link">${token.internal}</span>`
    }
}

// remove url inside <a>
export const remove_href = (token:marked.Token) => {
    if(token.type === "link") {
        token.href = "void(0);"
    }
}