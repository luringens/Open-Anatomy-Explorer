import * as THREE from "three"
import { Renderer } from "./renderer";

export class LabelManager {
    private positions: SavedRegion[] = [];
    private listContainer: HTMLElement;
    private renderer: Renderer;
    private uuid: string | null;
    private modelName: string;
    private url = "http://51.15.231.127:5000/LabelPoints";
    //private url = "http://localhost:3000/LabelPoints";

    private nextLabelId = 1;
    private regionSize = 2;
    private regionColor = "#FF00FF";
    private visible = true;

    constructor(renderer: Renderer, object: THREE.Object3D, modelName: string) {
        this.renderer = renderer;
        this.modelName = modelName;
        this.listContainer = document.getElementById("labels") as HTMLElement;

        const saveRegionButton = document.getElementById("save-region") as HTMLElement;
        saveRegionButton.addEventListener("click", this.savePosAsRegion.bind(this));

        this.renderer.addClickEventListener(this.clickHandler.bind(this));

        this.setupGui();

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

    private setupGui(): void {
        const f = this.renderer.gui.addFolder("Region settings");
        f.add(this, "regionSize", 1, 50, 1).name("Region radius");
        f.addColor(this, "regionColor").name("Region color");
        const planeVisibleHandler = f.add(this, "visible").name("Show tags");
        planeVisibleHandler.onChange(this.toggleVisibility.bind(this));
        f.open();
    }

    public reset(modelName: string): void {
        this.positions.forEach(pos => {
            const id = "label-row-" + String(pos.id);
            const elem = document.getElementById(id) as HTMLElement;
            elem.remove();
        });

        this.positions = [];
        this.modelName = modelName;

        this.renderer.resetVertexColors();
        this.loadLabels();
        this.setupGui();
    }

    private clickHandler(intersect: THREE.Intersection): boolean {
        for (const pos of this.positions) {
            if (pos.pos.clone().sub(intersect.point).length() < pos.radius) {
                this.blinkRowId(pos.id);
                return true;
            }
        }

        return false;
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

        const color = new THREE.Vector3();
        color.x = parseInt(this.regionColor.slice(1, 3), 16);
        color.y = parseInt(this.regionColor.slice(3, 5), 16);
        color.z = parseInt(this.regionColor.slice(5, 7), 16);
        const savedRegion = new SavedRegion(pos, color, this.regionSize, this.nextLabelId++, this.modelName);
        this.positions.push(savedRegion);

        const element = this.createRowColor(savedRegion, this.regionColor);
        this.listContainer.append(element);

        if (this.visible && this.renderer.lastMouseClickVerticeIds != null) {
            this.renderer.setColorForVertices(this.renderer.lastMouseClickVerticeIds, color);
        }
    }

    private createRow(pos: SavedRegion): HTMLElement {
        const str = "#"
            + pos.color.x.toString(16)
            + pos.color.y.toString(16)
            + pos.color.z.toString(16);
        return this.createRowColor(pos, str);
    }

    private createRowColor(pos: SavedRegion, colorstr: string): HTMLElement {
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
        tdColor.setAttribute("style", "background-color: " + colorstr + ";");
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

        if (this.visible)
            this.revisualize();
    }

    private revisualize(): void {
        this.renderer.resetVertexColors();
        this.positions.forEach(pos => {
            //this.renderer.setlabelPosition(pos.pos, pos.color);
        });
    }

    public toggleVisibility(): void {
        if (this.visible) {
            this.revisualize();
        } else {
            this.renderer.resetVertexColors();
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
                    // if (this.visible)
                    // TODO: reimplement
                    //this.renderer.setlabelPosition(p.pos, p.color);
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
