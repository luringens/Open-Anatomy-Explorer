import * as THREE from "three"
import { Renderer } from "./renderer";
import { isNullOrUndefined } from "util";

export class LabelManager {
    private positions: SavedRegion[] = [];
    private listContainer: HTMLElement;
    private renderer: Renderer;
    private uuid: string | null;
    private modelName: string;
    private url = "http://51.15.231.127:5000/LabelPoints";
    //private url = "http://localhost:3000/LabelPoints";

    private nextLabelId = 1;
    private regionSize = 50;
    private regionColor = "#FF00FF";
    private regionColorIntensity = 100;
    private visible = true;

    constructor(renderer: Renderer, object: THREE.Object3D, modelName: string) {
        this.renderer = renderer;
        this.modelName = modelName;
        this.listContainer = document.getElementById("labels") as HTMLElement;

        const saveRegionButton = document.getElementById("save-region") as HTMLElement;
        saveRegionButton.addEventListener("click", this.savePosAsRegion.bind(this));

        this.renderer.addClickEventListener(this.clickHandler.bind(this));

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
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public reset(newModel: THREE.Object3D, modelName: string): void {
        // const obj = newModel.children[0] ?? this.renderer.object;
        // this.canvasWrapper = new CanvasWrapper(obj);

        // this.positions.forEach(pos => {
        //     const id = "label-row-" + String(pos.id);
        //     const elem = document.getElementById(id) as HTMLElement;
        //     elem.remove();
        //     if (pos instanceof SavedPosition)
        //         this.renderer.scene.remove(pos.mesh)
        // });

        // this.positions = [];
        // this.modelName = modelName;

        // this.loadLabels();

        // if (this.visible) this.canvasWrapper.draw(this.positions);
    }

    public getRegionTexture(): THREE.DataTexture {
        const data = new Uint8Array(16 * 4);
        for (let i = 0; i < 16 * 4; i++) {
            data[i] = 255;
        }

        for (let i = 0; i < Math.min(this.positions.length, 8); i++) {
            const pos = this.positions[i];
            const off = i * 4 * 2;

            const len = pos.pos.length();
            const adjpos = pos.pos.divideScalar(len).multiplyScalar(128).addScalar(128);

            data[off + 0] = adjpos.x;
            data[off + 1] = adjpos.y;
            data[off + 2] = adjpos.z;
            data[off + 3] = len / 100;
            data[off + 4] = pos.color.x;
            data[off + 5] = pos.color.y;
            data[off + 6] = pos.color.z;
            data[off + 7] = 255;
        }
        return new THREE.DataTexture(data, 16, 1, THREE.RGBAFormat);
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
            // const canvas = this.canvasWrapper.canvas;
            // const sizeVector = new THREE.Vector2(canvas.width, canvas.height);
            // const regionPos = item.pos.clone().multiply(sizeVector);
            // const clickPos = uv.clone().multiply(sizeVector);

            // const withinX = Math.abs(clickPos.x - regionPos.x) < item.radius;
            // const withinY = Math.abs(clickPos.y - regionPos.y) < item.radius;
            // if (withinX && withinY)
            //     this.blinkRowId(item.id);
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

    private savePosAsRegion(): void {
        const pos = this.renderer.lastMouseClickPosition;

        //const colorStr = this.regionColor + this.regionColorIntensity.toString(16);
        const color = new THREE.Vector3();
        color.x = parseInt(this.regionColor.slice(1, 3), 16);
        color.y = parseInt(this.regionColor.slice(3, 5), 16);
        color.z = parseInt(this.regionColor.slice(5, 7), 16);
        const savedRegion = new SavedRegion(pos, color, this.regionSize, this.nextLabelId++, this.modelName);
        this.positions.push(savedRegion);

        const element = this.createRow(savedRegion);
        this.listContainer.append(element);

        if (this.visible)
            this.renderer.setTexture2(this.getRegionTexture());
    }

    private createRow(pos: SavedRegion): HTMLElement {
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

    private remove(element: HTMLElement, pos: SavedRegion): void {
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

        this.renderer.setTexture2(this.getRegionTexture());
    }

    public toggleVisibility(): void {
        if (this.visible) {
            this.renderer.setTexture2(this.getRegionTexture());
        } else {
            this.renderer.resetTexture2();
        }
    }

    private loadLabels(): void {
        if (this.uuid == null) return;

        const options = { method: "GET" };
        fetch(this.url + "/" + this.uuid, options)
            .then(async (response) => {
                if (!response.ok || response.body == null) {
                    throw new Error(
                        "Server responded " + response.status + " " + response.statusText
                    );
                }
                const data = await response.json() as SavedRegion[];
                data.forEach(item => {
                    if (item.model !== this.modelName) return;
                    const p = item;
                    const vec = new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z);
                    const savedRegion = new SavedRegion(vec, p.color, p.radius, p.id, p.model, p.name);
                    this.positions.push(savedRegion);
                    const element = this.createRow(savedRegion);
                    this.listContainer.append(element);
                    if (this.visible)
                        this.renderer.setTexture2(this.getRegionTexture());
                    this.nextLabelId = Math.max(this.nextLabelId, p.id);
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

export class SavedRegion {
    pos: THREE.Vector3;
    id: number;
    radius: number;
    color: THREE.Vector3;
    model: string;
    name: string;

    constructor(pos: THREE.Vector3, color: THREE.Vector3, radius: number, id: number, modelName: string, name = "") {
        this.pos = pos;
        this.color = color;
        this.radius = radius;
        this.id = id;
        this.name = name;
        this.model = modelName;
    }
}
