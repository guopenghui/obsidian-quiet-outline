import {App, CachedMetadata} from "obsidian";
import {isNativeError} from "util/types";

// a trick to use obsidian builtin function to parse markdown headings
export async function parseMetaDataCache(app: App, text: string): Promise<CachedMetadata> {
    // @ts-ignore
	const res = await app.metadataCache.computeMetadataAsync((new TextEncoder()).encode(text).buffer);
    // const res = await app.internalPlugins.plugins['canvas']._children[0].parseText(text)
    return res;
}

type Content = {
	preContent: string,
	children: Section[],
}
type Section = {
	id: number,
	heading: string,
	headingLevel: number, // 1-based
	headingExpaned: boolean,
	content: Content,
	type: "section"
}

export async function parseMarkdown(text: string): Promise<Section> {
	const res = await parseMetaDataCache(app, text);
	const headings = res.headings || [];
	const sections = res.sections || [];
		
	const content: Content = {
		preContent: "",
		children: [],
	};

	const stack: Section[] = [{
		heading: "",
		headingLevel: 0,
		headingExpaned: false,
		id: -1,
		content, type: "section"
	}];

	let start = 0, end = 0, headingIndex = 0;
	for(let section of sections) {
		if(section.type === "heading") {
			end = Math.max(section.position.start.offset, 0);
			stack.last()!.content.preContent = text.slice(start, end);

			while(headings[headingIndex].level <= stack.last()!.headingLevel) {
				stack.pop();	
			}
			
			const newEntry: Section = {
				heading: headings[headingIndex].heading,
				headingLevel: headings[headingIndex].level,
				headingExpaned: false,
				id: headingIndex,
				content: {
					preContent: "",
					children: [],
				},
				type: "section",
			}
			stack.last()!.content.children.push(newEntry);
			stack.push(newEntry);

			start = headings[headingIndex].position.end.offset + 1;
			headingIndex++;
		}
	}

	stack.last()!.content.preContent = text.slice(start);
	return stack[0];
}

export function moveHeading(root: Section, fromNo: number, toNo: number, position: "before" | "after" | "inside") {
	const [fromParent, from] = findSection(root, root, fromNo);
	const [toParent, to] = findSection(root, root, toNo);
	const newFrom = structuredClone(from);

	switch(position) {
		case "before":
			toParent.content.children.splice(toParent.content.children.indexOf(to), 0, newFrom);
			modifyHeadingLevel(newFrom, to.headingLevel - from.headingLevel);
			break;
		case "after":
			toParent.content.children.splice(toParent.content.children.indexOf(to) + 1, 0, newFrom);
			modifyHeadingLevel(newFrom, to.headingLevel - from.headingLevel);
			break;
		case "inside":
			to.content.children.push(newFrom);
			modifyHeadingLevel(newFrom, to.headingLevel - from.headingLevel + 1);
			break;
	}	
	fromParent.content.children.splice(fromParent.content.children.indexOf(from), 1);
}

export function findSection(root: Section, parent: Section, id: number): [Section, Section] {
	if(root.id === id) return [parent, root];

	for(let child of root.content.children) {
		const res = findSection(child, root, id);
		if(res) return res;
	}
	
	throw new Error(`section ${id} not found`);
}

export function visitSection(root: Section, fn: (section: Section) => void) {
	fn(root);

	for(let child of root.content.children) {
		visitSection(child, fn);
	}	
}

function stringifyContent(content: Content): string {
	return content.preContent + content.children.map(stringifySection).join("");
}

export function stringifySection(section: Section): string {
	const heading = "#".repeat(section.headingLevel) + " " + section.heading;
	const content = stringifyContent(section.content);
	
	return section.id < 0? content : `${heading}\n${content}`
}

function modifyHeadingLevel(section: Section, delta: number) {
	section.headingLevel += delta;
	section.content.children.forEach(child => {
		modifyHeadingLevel(child, delta);
	});
}
