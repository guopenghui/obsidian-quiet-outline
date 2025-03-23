import {MarkDownNav} from "./markdown";

export class KanbanNav extends MarkDownNav {
	getId(): string {
		return "kanban";
	}
	canDrop: boolean = false
	async install(): Promise<void> {
		// @ts-ignore
		if(!MarkDownNav._installed) {
			await super.install();
			// @ts-ignore
			MarkDownNav._installed = true;
		}
	}
	async jump(key: number): Promise<void> {
		const panes = document.querySelectorAll(
			'.workspace-leaf[style=""] .kanban-plugin__lane-wrapper'
		);
		
		panes[key]?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
	}
}
