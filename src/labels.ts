import * as THREE from "three"
import { Renderer } from "./renderer";
import { isNullOrUndefined } from "util";
import CanvasWrapper from "./canvasWrapper";

export class LabelManager {
    private positions: SavedItem[] = [];
    private listContainer: HTMLElement;
    private renderer: Renderer;
    private canvasWrapper: CanvasWrapper;
    private uuid: string | null;
    private url = "http://51.15.231.127:5000/LabelPoints";
    //private url = "http://localhost:3000/LabelPoints";

    private nextLabelId = 1;
    private regionSize = 50;
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
        f.add(this, "regionSize", 5, 500, 1).name("Region radius");
        f.addColor(this, "regionColor").name("Region color");
        f.add(this, "regionColorIntensity", 0, 255, 1).name("Transparency");
        const planeVisibleHandler = f.add(this, "visible").name("Show tags");
        planeVisibleHandler.onChange(this.toggleVisibility.bind(this));

        f.open();

        // Store/update/delete label initialization
        {
            const queryString = window.location.search;
            const urlParams = new URLSearchParams(queryString);
            this.uuid = urlParams.get("id");

            const saveAllLabelsButton = document.getElementById("labels-save") as HTMLElement;
            const updateAllLabelsButton = document.getElementById("labels-update") as HTMLElement;
            const deleteAllLabelsButton = document.getElementById("labels-delete") as HTMLElement;
            saveAllLabelsButton.addEventListener("click", this.storeLabels.bind(this));
            if (this.uuid == null) {
                updateAllLabelsButton.remove();
                deleteAllLabelsButton.remove();
            } else {
                this.loadLabels();
                updateAllLabelsButton.addEventListener("click", this.updateLabels.bind(this));
                deleteAllLabelsButton.addEventListener("click", this.deleteLabels.bind(this));
                updateAllLabelsButton.classList.remove("hide");
                deleteAllLabelsButton.classList.remove("hide");

                // TODO: Load data.
            }
        }
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
        tdLabelInput.id = "label-input-" + String(pos.id);
        tdLabelInput.className = "label-name";
        tdLabelInput.placeholder = "New label";
        tdLabelInput.value = pos.name;
        const tdLabel = document.createElement("td");
        tdLabel.append(tdLabelInput);
        element.append(tdLabel);

        const tdColor = document.createElement("td");
        tdColor.setAttribute("style", "background-color: " + pos.color + ";");
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

    private loadLabels(): void {
        const options = { method: "GET" };
        fetch(this.url + "/" + this.uuid, options)
            .then(async (response) => {
                if (!response.ok || response.body == null) {
                    throw new Error(
                        "Server responded " + response.status + " " + response.statusText
                    );
                }
                const data = await response.json() as SavedItem[];
                data.forEach(item => {
                    if (item.radius == null) {
                        const p = item as SavedPosition;
                        const vec = new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z);
                        const savedPosition = new SavedPosition(vec, p.color, p.id, p.name);
                        this.positions.push(savedPosition);
                        if (this.visible)
                            this.renderer.scene.add(savedPosition.mesh);
                        const element = this.createRow(savedPosition);
                        this.listContainer.append(element);
                        this.nextLabelId = Math.max(this.nextLabelId, p.id);
                    } else {
                        const p = item as SavedRegion;
                        const vec = new THREE.Vector2(p.pos.x, p.pos.y);
                        const savedRegion = new SavedRegion(vec, p.color, p.radius, p.id, p.name);
                        this.positions.push(savedRegion);
                        const element = this.createRow(savedRegion);
                        this.listContainer.append(element);
                        if (this.visible)
                            this.canvasWrapper.draw(this.positions);
                        this.nextLabelId = Math.max(this.nextLabelId, p.id);
                    }
                });
            });
    }

    private storeLabels(): void {
        this.updateNames();
        const options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(this.positions)
        };
        fetch(this.url, options)
            .then(async (response) => {
                if (!response.ok || response.body == null) {
                    throw new Error(
                        "Server responded " + response.status + " " + response.statusText
                    );
                }
                const data = await response.json();
                console.info("Data stored - UUID: " + data)
                window.location.href = window.origin + "?id=" + data;
            });
    }

    private updateLabels(): void {
        this.updateNames();
        if (this.uuid == null) throw "UUID is null.";
        const options = {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(this.positions)
        };
        fetch(this.url + "/" + this.uuid, options)
            .then((response) => {
                if (!response.ok || response.body == null) {
                    throw new Error(
                        "Server responded " + response.status + " " + response.statusText
                    );
                }
                console.info("Data updated")
                window.location.href = window.origin + "?id=" + this.uuid;
            });
    }

    private deleteLabels(): void {
        if (this.uuid == null) throw "UUID is null.";
        const options = {
            method: "DELETE",
        };
        fetch(this.url + "/" + this.uuid, options)
            .then((response) => {
                if (!response.ok || response.body == null) {
                    throw new Error(
                        "Server responded " + response.status + " " + response.statusText
                    );
                }
                console.info("Data deleted")
                window.location.href = window.origin;
            });
    }

    private updateNames(): void {
        this.positions.forEach(pos => {
            const element = document.getElementById("label-input-" + String(pos.id)) as HTMLInputElement | null;
            if (element === null) throw "Could not find label row!";

            pos.name = element.value;
        });
    }
}

export interface SavedItem {
    id: number;
    pos: THREE.Vector2 | THREE.Vector3;
    color: string;
    name: string;
    radius: number | null;
}

export class SavedPosition implements SavedItem {
    pos: THREE.Vector3;
    mesh: THREE.Mesh;
    id: number;
    color: string;
    radius: null;
    name = "";

    constructor(pos: THREE.Vector3, color: string, id: number, name = "") {
        this.pos = pos;
        this.color = color;
        this.id = id;
        this.name = name;

        const geometry = new THREE.SphereGeometry();
        const material = new THREE.MeshBasicMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.add(pos);
        this.mesh.name = "label_" + String(id);
    }

    toJSON: (key: unknown) => SavedItem = (): SavedItem => {
        return toJSON(this);
    };
}

export class SavedRegion implements SavedItem {
    pos: THREE.Vector2;
    id: number;
    radius: number;
    color: string;
    name = "";

    constructor(pos: THREE.Vector2, color: string, radius: number, id: number, name = "") {
        this.pos = pos;
        this.color = color;
        this.radius = radius;
        this.id = id;
        this.name = name;
    }

    toJSON: (key: unknown) => SavedItem = (): SavedItem => {
        return toJSON(this);
    };
}

function toJSON(item: SavedItem): SavedItem {
    return {
        id: item.id,
        pos: item.pos,
        color: item.color,
        name: item.name,
        radius: item.radius
    };
}
