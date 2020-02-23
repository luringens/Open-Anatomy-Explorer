import * as THREE from "three"
import { Renderer } from "./renderer";
import { isNullOrUndefined } from "util";

export class LabelManager {
    private positions: SavedItem[] = [];
    private listContainer: HTMLElement;
    private renderer: Renderer;
    private canvasWrapper: CanvasWrapper;

    private nextLabelId = 1;
    private regionSize = 20;
    private regionColor = "#FF00FF";
    private regionColorIntensity = 100;
    private visible = true;

    constructor(renderer: Renderer, object: THREE.Object3D) {
        this.renderer = renderer;
        this.listContainer = document.getElementById("labels") as HTMLElement;

        const saveLabelButton = document.getElementById("save-label") as HTMLElement;
        saveLabelButton.addEventListener("click", this.savePosAsLabel.bind(this));
        const saveRegionButton = document.getElementById("save-region") as HTMLElement;
        saveRegionButton.addEventListener("click", this.savePosAsRegion.bind(this));

        this.renderer.addClickEventListener(this.clickHandler.bind(this));

        const obj = object.children[0] ?? renderer.object;
        this.canvasWrapper = new CanvasWrapper(obj);

        const f = renderer.gui.addFolder("Region settings");
        f.add(this, "regionSize", 5, 100, 1).name("Region radius");
        f.addColor(this, "regionColor").name("Region color");
        f.add(this, "regionColorIntensity", 0, 255, 1).name("Region transparency");
        const planeVisibleHandler = f.add(this, "visible").name("Show tags");
        planeVisibleHandler.onChange(this.toggleVisibility.bind(this));

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
            const id = Number.parseInt(object.name.substring(6));
            if (pos.id !== id) return;

            this.blinkRowId(pos.id);
        });
        return true;
    }

    private clickHandlerRegion(uv: THREE.Vector2): boolean {
        this.positions.forEach(item => {
            if (item instanceof SavedRegion) {
                const canvas = this.canvasWrapper.canvas;
                const sizeVector = new THREE.Vector2(canvas.width, canvas.height);
                const regionPos = item.pos.clone().multiply(sizeVector);
                const clickPos = uv.clone().multiply(sizeVector);

                const withinX = Math.abs(clickPos.x - regionPos.x) < item.radius;
                const withinY = Math.abs(clickPos.y - regionPos.y) < item.radius;
                if (withinX && withinY)
                    this.blinkRowId(item.id);
            }
        });
        return true;
    }

    private blinkRowId(id: number): void {
        const element = document.getElementById("label-row-" + String(id));
        if (element === null) throw "Could not find label row!";

        element.classList.add("row-animate");
        window.setTimeout(() => {
            if (element === null) throw "Could not find label row!";
            element.classList.remove("row-animate");
        }, 2900);
    }

    private savePosAsLabel(): void {
        const pos = this.renderer.lastMouseClickPosition;

        const savedPosition = new SavedPosition(pos, this.regionColor, this.nextLabelId++);
        this.positions.push(savedPosition);

        if (this.visible)
            this.renderer.scene.add(savedPosition.mesh);

        const element = this.createRow(savedPosition);
        this.listContainer.append(element);
    }

    private savePosAsRegion(): void {
        const pos = this.renderer.lastMouseClickTexturePosition;

        const color = this.regionColor + this.regionColorIntensity.toString(16);
        const savedRegion = new SavedRegion(pos, color, this.regionSize, this.nextLabelId++);
        this.positions.push(savedRegion);

        const element = this.createRow(savedRegion);
        this.listContainer.append(element);

        if (this.visible)
            this.canvasWrapper.draw(this.positions);
    }

    private createRow(pos: SavedItem): HTMLElement {
        const element = document.createElement("tr");
        element.className = "label-row";
        element.id = "label-row-" + String(pos.id);
        const tdLabelInput = document.createElement("input");
        tdLabelInput.className = "label-name";
        tdLabelInput.placeholder = "New label";
        const tdLabel = document.createElement("td");
        tdLabel.append(tdLabelInput);
        element.append(tdLabel);

        const tdColor = document.createElement("td");
        tdColor.setAttribute("style", "background-color: " + this.regionColor + ";");
        element.append(tdColor);

        const tdRemoveBtn = document.createElement("button");
        tdRemoveBtn.innerText = "Remove";
        tdRemoveBtn.className = "btn-remove";
        tdRemoveBtn.setAttribute("style", "background-color: #ff6666;");
        tdRemoveBtn.addEventListener("click", this.remove.bind(this, element, pos));
        const tdRemove = document.createElement("td");
        tdRemove.setAttribute("style", "background-color: #ff6666;");
        tdRemove.append(tdRemoveBtn)
        element.append(tdRemove);

        return element;
    }

    private remove(element: HTMLElement, pos: SavedItem): void {
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
            this.renderer.scene.remove(pos.mesh)
        else if (pos instanceof SavedRegion && this.visible)
            this.canvasWrapper.draw(this.positions);
    }

    public toggleVisibility(): void {
        if (this.visible) {
            this.canvasWrapper.draw(this.positions);
            this.positions.forEach(element => {
                if (element instanceof SavedPosition) {
                    this.renderer.scene.add(element.mesh);
                }
            });
        } else {
            this.canvasWrapper.draw([]);
            this.positions.forEach(element => {
                if (element instanceof SavedPosition) {
                    this.renderer.scene.remove(element.mesh);
                }
            });
        }
    }
}

class CanvasWrapper {
    material: THREE.MeshPhongMaterial;
    materialTex: THREE.Texture;
    texture: HTMLImageElement;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    constructor(obj: THREE.Object3D) {
        // Lots of type assumptions here...
        const mesh = obj as THREE.Mesh;
        this.material = mesh.material as THREE.MeshPhongMaterial;

        this.canvas = document.createElement("canvas");
        if (isNullOrUndefined(this.material.map)) throw "Missing material map";
        this.texture = this.material.map.image;
        this.materialTex = this.material.map;

        this.canvas.height = this.materialTex.image.height;
        this.canvas.width = this.materialTex.image.width;
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

        this.material.map.image = this.canvas;
        this.draw([]);
    }

    public draw(items: SavedItem[]): void {
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

        const geometry = new THREE.SphereGeometry();
        const material = new THREE.MeshBasicMaterial({ color: color });
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
