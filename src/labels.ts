import * as THREE from "three"
import { Renderer } from "./renderer";
import { isNullOrUndefined } from "util";

export class LabelManager {
    private positions: SavedItem[] = [];
    private listContainer: HTMLElement;
    private renderer: Renderer;
    private nextLabelId: number = 1;
    private canvasWrapper: CanvasWrapper;
    private regionSize: number = 20;
    private regionColor: string = "#FF00FF";
    private regionColorIntensity: number = 100;

    constructor(renderer: Renderer, object: THREE.Object3D) {
        this.renderer = renderer;
        this.listContainer = <HTMLElement>document.getElementById("labels");

        let saveLabelButton = <HTMLElement>document.getElementById("save-label");
        saveLabelButton.addEventListener("click", this.savePosAsLabel.bind(this));
        let saveRegionButton = <HTMLElement>document.getElementById("save-region");
        saveRegionButton.addEventListener("click", this.savePosAsRegion.bind(this));

        this.renderer.addClickEventListener(this.clickHandler.bind(this));

        let obj = object.children[0] ?? renderer.object;
        this.canvasWrapper = new CanvasWrapper(obj);

        var f = renderer.gui.addFolder("Region settings");
        f.add(this, "regionSize", 5, 100, 1).name("Region radius");
        f.addColor(this, "regionColor").name("Region color");
        f.add(this, "regionColorIntensity", 0, 255, 1).name("Region transparency");
        f.open();
    }

    private clickHandler(intersect: THREE.Intersection): boolean {
        if (intersect.object.name.startsWith("label_"))
            return this.clickHandlerPosition(intersect.object);

        if (!isNullOrUndefined(intersect.uv)) {
            return this.clickHandlerRegion(intersect.uv);
        }

        return false;
    }

    private clickHandlerPosition(object: THREE.Object3D): boolean {
        this.positions.forEach(pos => {
            let id = Number.parseInt(object.name.substring(6));
            if (pos.id !== id) return;

            this.blinkRowId(pos.id);
        });
        return true;
    }

    private clickHandlerRegion(uv: THREE.Vector2): boolean {
        this.positions.forEach(item => {
            if (item instanceof SavedRegion) {
                let canvas = this.canvasWrapper.canvas;
                let sizeVector = new THREE.Vector2(canvas.width, canvas.height);
                let regionPos = item.pos.clone().multiply(sizeVector);
                let clickPos = uv.clone().multiply(sizeVector);

                let withinX = Math.abs(clickPos.x - regionPos.x) < item.radius;
                let withinY = Math.abs(clickPos.y - regionPos.y) < item.radius;
                if (withinX && withinY)
                    this.blinkRowId(item.id);
            }
        });
        return true;
    }

    private blinkRowId(id: number) {
        let element = document.getElementById("label-row-" + String(id));
        if (element === null) throw "Could not find label row!";

        element.classList.add("row-animate");
        window.setTimeout(() => {
            if (element === null) throw "Could not find label row!";
            element.classList.remove("row-animate");
        }, 2900);
    }

    private savePosAsLabel(_: Event) {
        let pos = this.renderer.lastMouseClickPosition;

        let savedPosition = new SavedPosition(pos, this.regionColor, this.nextLabelId++);
        this.positions.push(savedPosition);
        this.renderer.scene.add(savedPosition.mesh);

        let element = this.createRow(savedPosition);
        this.listContainer.append(element);
    }

    private savePosAsRegion(_: Event) {
        let pos = this.renderer.lastMouseClickTexturePosition;

        let color = this.regionColor + this.regionColorIntensity.toString(16);
        let savedRegion = new SavedRegion(pos, color, this.regionSize, this.nextLabelId++);
        this.positions.push(savedRegion);

        let element = this.createRow(savedRegion);
        this.listContainer.append(element);

        this.canvasWrapper.draw(this.positions);
    }

    private createRow(pos: SavedItem): HTMLElement {
        let element = document.createElement("tr");
        element.className = "label-row";
        element.id = "label-row-" + String(pos.id);
        let td_label_input = document.createElement("input");
        td_label_input.className = "label-name";
        td_label_input.placeholder = "New label";
        let td_label = document.createElement("td");
        td_label.append(td_label_input);
        element.append(td_label);

        let td_color = document.createElement("td");
        td_color.setAttribute("style", "background-color: " + this.regionColor + ";");
        element.append(td_color);

        let td_remove_btn = document.createElement("button");
        td_remove_btn.innerText = "Remove";
        td_remove_btn.className = "btn-remove";
        td_remove_btn.setAttribute("style", "background-color: #ff6666;");
        td_remove_btn.addEventListener("click", this.remove.bind(this, element, pos));
        let td_remove = document.createElement("td");
        td_remove.setAttribute("style", "background-color: #ff6666;");
        td_remove.append(td_remove_btn)
        element.append(td_remove);

        return element;
    }

    private remove(element: HTMLElement, pos: SavedItem) {
        let index = -1;
        for (let i = 0; i < this.positions.length; i++) {
            if (this.positions[i].id === pos.id) {
                index = i;
                break;
            }
        }
        if (index === -1) throw "Could not find position in label list.";

        element.remove();
        this.positions.splice(index, 1);

        if (pos instanceof SavedPosition)
            this.renderer.scene.remove((<SavedPosition>pos).mesh)
        else if (pos instanceof SavedRegion)
            this.canvasWrapper.draw(this.positions);
    }
}

class CanvasWrapper {
    material: THREE.MeshBasicMaterial;
    materialTex: THREE.Texture;
    texture: HTMLImageElement;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    constructor(obj: THREE.Object3D) {
        // Type system hackery.
        if (isNullOrUndefined((<any>obj).material)) {
            throw "Object has no material!";
        }

        this.canvas = document.createElement("canvas");
        this.material = (<any>obj).material;
        if (isNullOrUndefined(this.material.map)) throw "Missing material map";
        this.texture = this.material.map.image;
        this.materialTex = this.material.map;

        this.canvas.height = this.materialTex.image.height;
        this.canvas.width = this.materialTex.image.width;
        this.ctx = <CanvasRenderingContext2D>this.canvas.getContext("2d");

        this.material.map.image = this.canvas;
        this.draw([]);
    }

    public draw(items: SavedItem[]) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.texture, 0, 0);
        items.forEach(item => {
            if (item instanceof SavedRegion) {
                this.ctx.fillStyle = item.color;
                this.ctx.beginPath();
                this.ctx.ellipse(
                    item.pos.x * this.canvas.width,
                    item.pos.y * this.canvas.height,
                    item.radius,
                    item.radius,
                    0, // rotation
                    0, // start radius
                    2 * Math.PI // end radius
                );
                this.ctx.fill();
            }
        });
        this.materialTex.needsUpdate = true;
        this.material.needsUpdate = true;
    }
}

interface SavedItem {
    id: number;
}

class SavedPosition implements SavedItem {
    pos: THREE.Vector3;
    mesh: THREE.Mesh;
    id: number;
    color: string;

    constructor(pos: THREE.Vector3, color: string, id: number) {
        this.pos = pos;
        this.color = color;
        this.id = id;

        let geometry = new THREE.SphereGeometry();
        let material = new THREE.MeshBasicMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.add(pos);
        this.mesh.name = "label_" + String(id);
    }
}

class SavedRegion implements SavedItem {
    pos: THREE.Vector2;
    id: number;
    radius: number;
    color: string;

    constructor(pos: THREE.Vector2, color: string, radius: number, id: number) {
        this.pos = pos;
        this.color = color;
        this.radius = radius;
        this.id = id;
    }
}
