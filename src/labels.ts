import * as THREE from "three"
import { Renderer } from "./renderer";

export class LabelManager {
    private positions: SavedPosition[] = [];
    private listContainer: HTMLElement;
    private renderer: Renderer;
    private nextLabelId: number = 1;

    constructor(renderer: Renderer) {
        this.renderer = renderer;
        this.listContainer = <HTMLElement>document.getElementById("labels");

        let saveButton = <HTMLElement>document.getElementById("save-label");
        saveButton.addEventListener("click", this.saveCurrentPosition.bind(this));

        this.renderer.addClickEventListener(this.clickHandler.bind(this));
    }

    private clickHandler(object: THREE.Object3D): boolean {
        if (!object.name.startsWith("label_")) return false;
        this.positions.forEach(pos => {
            let id = Number.parseInt(object.name.substring(6));
            if (pos.id !== id) return;

            let element = document.getElementById("label-row-" + String(pos.id));
            if (element === null) throw "Could not find label row!";

            element.classList.add("row-animate");
            window.setTimeout(() => {
                if (element === null) throw "Could not find label row!";
                element.classList.remove("row-animate");
            }, 2900);
        });
        return true;
    }

    private saveCurrentPosition(_: Event) {
        let pos = this.renderer.lastMouseClickPosition;

        let savedPosition = new SavedPosition(pos, this.nextLabelId++);
        this.positions.push(savedPosition);
        this.renderer.scene.add(savedPosition.mesh);

        let element = this.createRow(savedPosition);
        this.listContainer.append(element);
    }

    private createRow(pos: SavedPosition): HTMLElement {
        let element = document.createElement("tr");
        element.className = "label-row";
        element.id = "label-row-" + String(pos.id);
        let td_label_input = document.createElement("input");
        td_label_input.className = "label-name";
        td_label_input.placeholder = "New label";
        let td_label = document.createElement("td");
        td_label.append(td_label_input);
        element.append(td_label);

        let td_remove_btn = document.createElement("button");
        td_remove_btn.innerText = "Remove";
        td_remove_btn.className = "btn-remove";
        td_remove_btn.addEventListener("click", this.remove.bind(this, element, pos));
        let td_remove = document.createElement("td");
        td_remove.append(td_remove_btn)
        element.append(td_remove);

        return element;
    }

    private remove(element: HTMLElement, pos: SavedPosition) {
        let index = -1;
        for (let i = 0; i < this.positions.length; i++) {
            if (this.positions[i].pos === pos.pos) {
                index = i;
                break;
            }
        }
        if (index === -1) throw "Could not find position in label list.";
        this.renderer.scene.remove(this.positions[index].mesh)
        element.remove();
        this.positions.splice(index, 1);
    }
}

class SavedPosition {
    pos: THREE.Vector3;
    mesh: THREE.Mesh;
    id: number;

    constructor(pos: THREE.Vector3, id: number) {
        this.pos = pos;
        this.id = id;

        let geometry = new THREE.SphereGeometry();
        let material = new THREE.MeshBasicMaterial({ color: "#FFFFFF" });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.add(pos);
        this.mesh.name = "label_" + String(id);
    }
}
