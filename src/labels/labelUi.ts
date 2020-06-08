import { GUI } from "dat.gui";
import { LabelManager, SavedRegion } from "./labelManager";
import THREE = require("three");
import { binarySearch } from "../utils";

export class LabelUi {
    private visible = true;
    private listContainer: HTMLElement;
    private labelManager: LabelManager
    private uuid: string | null;
    private regionColor = "#FF00FF";
    private nextLabelId = 1;
    private modelName: string;
    private activeLabel: null | number = null;
    private toolEnabled = false;

    public constructor(gui: GUI, modelName: string, labelManager: LabelManager) {
        this.listContainer = document.getElementById("labels") as HTMLElement;
        this.labelManager = labelManager;
        this.modelName = modelName;

        const f = gui.addFolder("Labelling settings");
        f.addColor(this, "regionColor").name("Region color");
        const planeVisibleHandler = f.add(this, "visible").name("Show tags");
        planeVisibleHandler.onChange(labelManager.toggleVisibility.bind(labelManager));
        f.open();

        const saveRegionButton = document.getElementById("save-region") as HTMLElement;
        saveRegionButton.addEventListener("click", this.savenewLabel.bind(this));

        // Store/update/delete label initialization
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

        (document.getElementById("tool-camera") as HTMLInputElement)
            .onchange = this.onToolChange.bind(this);
        (document.getElementById("tool-labeler") as HTMLInputElement)
            .onchange = this.onToolChange.bind(this);
    }

    private onToolChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
            this.toolEnabled = target.value == "labeler";
        }

        if (this.toolEnabled) {
            const handler = this.addVerticesToLabel.bind(this);
            this.labelManager.renderer.overrideMouseControls(handler);
        } else {
            this.labelManager.renderer.overrideMouseControls(null);
        }
    }

    private savenewLabel(): void {
        const vertices = this.labelManager.renderer.lastMouseClickVerticeIds;
        if (vertices == null) return;

        const color = new THREE.Vector3();
        color.x = parseInt(this.regionColor.slice(1, 3), 16);
        color.y = parseInt(this.regionColor.slice(3, 5), 16);
        color.z = parseInt(this.regionColor.slice(5, 7), 16);

        const savedRegion = new SavedRegion(vertices, color, this.nextLabelId++, this.modelName);
        this.labelManager.positions.push(savedRegion);
        this.activeLabel = savedRegion.id;

        const element = this.createRowColor(savedRegion, this.regionColor);
        this.listContainer.append(element);

        if (this.visible) {
            this.labelManager.renderer.setColorForVertices(vertices, color);
        }
    }

    private addVerticesToLabel(hit: THREE.Intersection): void {
        const pos = this.labelManager.positions
            .find(label => label.id == this.activeLabel);

        if (this.activeLabel == null || hit.face == null || pos == null) return;
        pos.vertices.sort();
        const vertices = [hit.face.a, hit.face.b, hit.face.c];
        for (const vertex of vertices) {
            if (binarySearch(pos.vertices, vertex) == null) {
                pos.vertices.push(vertex);
                pos.vertices.sort();
            }
        }
        this.labelManager.renderer.setColorForVertices(vertices, pos.color);
    }

    public blinkRowId(id: number): void {
        const element = document.getElementById("label-row-" + String(id));
        if (element === null) throw "Could not find label row!";

        element.classList.add("row-animate");
        window.setTimeout(() => {
            element.classList.remove("row-animate");
        }, 2900);
    }

    public reload(gui: GUI, newModelName: string): void {
        const f = gui.addFolder("Labelling settings");
        f.addColor(this, "regionColor").name("Region color");
        const planeVisibleHandler = f.add(this, "visible").name("Show tags");
        planeVisibleHandler.onChange(this.labelManager.toggleVisibility.bind(this.labelManager));
        f.open();

        this.modelName = newModelName;
        this.loadLabels();
    }

    private loadLabels(): void {
        // TODO
    }

    private storeLabels(): void {
        // TODO
    }

    private updateLabels(): void {
        // TODO
    }

    private deleteLabels(): void {
        // TODO
    }

    private setActiveLabel(event: Event): void {
        const target = event.target as HTMLInputElement;
        if (target.checked) this.activeLabel = Number.parseInt(target.value);
    }

    private createRowColor(pos: SavedRegion, colorstr: string): HTMLElement {
        const element = document.createElement("tr");
        element.className = "label-row";
        element.id = "label-row-" + String(pos.id);

        const labelRadio = document.createElement("input");
        labelRadio.id = "label-radio-" + String(pos.id);
        labelRadio.type = "radio";
        labelRadio.name = "label-radio";
        labelRadio.checked = true;
        labelRadio.value = String(pos.id);
        labelRadio.onchange = this.setActiveLabel.bind(this);
        const tdLabelRadio = document.createElement("td");
        tdLabelRadio.append(labelRadio);
        element.append(tdLabelRadio);

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
        element.remove();
        this.labelManager.removeLabel(pos);
    }

    private updateNames(): void {
        this.labelManager.positions.forEach(pos => {
            const element = document.getElementById("label-input-" + String(pos.id)) as HTMLInputElement | null;
            if (element === null) throw "Could not find label row!";

            pos.name = element.value;
        });
    }
}
