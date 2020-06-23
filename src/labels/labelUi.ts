import { GUI } from "dat.gui";
import { LabelManager } from "./labelManager";
import { Label } from "./Label";
import THREE = require("three");
import { toHex, binarySearch } from "../utils";
import { LabelStorage } from "./labelStorage";

export class LabelUi {
    private visible = true;
    private listContainer: HTMLElement;
    private labelManager: LabelManager
    private uuid: string | null;
    private regionColor = "#FF00FF";
    private regionTransparency = 255;
    private nextLabelId = 1;
    private modelName: string;
    private toolEnabled = false;
    public activeLabel: null | number = null;
    public brushSize = 2;

    public constructor(modelName: string, labelManager: LabelManager) {
        this.listContainer = document.getElementById("labels") as HTMLElement;
        this.labelManager = labelManager;
        this.modelName = modelName;

        // Show editor
        document.getElementById("label-editor")?.classList.remove("hide");

        labelManager.renderer.addClickEventListener(this.clickHandler.bind(this));

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
            const handler = this.labelManager.addVerticesToLabel.bind(this.labelManager);
            this.labelManager.renderer.overrideMouseControls(handler);
        } else {
            this.labelManager.renderer.overrideMouseControls(null);
        }
    }

    private savenewLabel(): void {
        const vertices = this.labelManager.renderer.lastMouseClickVerticeIds;
        if (vertices == null) return;

        const color = new THREE.Vector4();
        color.x = parseInt(this.regionColor.slice(1, 3), 16);
        color.y = parseInt(this.regionColor.slice(3, 5), 16);
        color.z = parseInt(this.regionColor.slice(5, 7), 16);
        color.w = this.regionTransparency;

        const savedRegion = new Label(vertices, color, this.nextLabelId++, this.modelName);
        this.labelManager.labels.push(savedRegion);
        this.activeLabel = savedRegion.id;

        const element = this.createRowColor(savedRegion, this.regionColor);
        this.listContainer.append(element);

        if (this.visible) {
            this.labelManager.renderer.setColorForVertices(vertices, color);
        }
    }

    private clickHandler(intersect: THREE.Intersection): boolean {
        if (intersect.face == null) return false;
        const face = intersect.face;
        for (const pos of this.labelManager.labels) {
            pos.vertices.sort();
            for (const v of [face.a, face.b, face.c]) {
                const idx = binarySearch(pos.vertices, v);
                if (idx != null) {
                    this.blinkRowId(pos.id);
                    this.activeLabel = pos.id;
                    const e = document.getElementById("label-radio-" + String(pos.id));
                    (e as HTMLInputElement).checked = true;
                    return true;
                }
            }
        }

        return false;
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
        f.add(this, "regionTransparency", 1, 255, 1).name("Transparency");
        f.add(this, "brushSize", 1, 5, 1).name("Brush size");
        const planeVisibleHandler = f.add(this, "visible").name("Show tags");
        planeVisibleHandler.onChange(this.labelManager.toggleVisibility.bind(this.labelManager));
        f.open();

        this.modelName = newModelName;
        if (this.uuid != null)
            this.loadLabels();
    }

    private loadLabels(): void {
        if (this.uuid == null) {
            alert("No UUID to load!");
            return;
        }

        LabelStorage.loadLabels(this.uuid, (labels: Label[]) => {
            this.labelManager.labels = [];
            labels.forEach(label => {
                if (label.model !== this.modelName) return;
                this.labelManager.labels.push(label);
                const element = this.createRow(label);
                this.listContainer.append(element);
                if (this.visible)
                    this.labelManager.renderer.setColorForVertices(label.vertices, label.color);
                this.nextLabelId = Math.max(this.nextLabelId, label.id + 1);
            });
        });
    }

    private storeLabels(): void {
        this.updateNames();
        LabelStorage.storeLabels(this.labelManager.labels);
    }

    private updateLabels(): void {
        this.updateNames();
        if (this.uuid == null) alert("No labels have been stored yet.");
        else LabelStorage.updateLabels(this.uuid, this.labelManager.labels);

    }

    private deleteLabels(): void {
        if (this.uuid == null) alert("No labels have been stored yet.");
        else LabelStorage.deleteLabels(this.uuid);
    }

    private setActiveLabel(event: Event): void {
        const target = event.target as HTMLInputElement;
        if (target.checked) this.activeLabel = Number.parseInt(target.value);
    }

    private createRow(label: Label): HTMLElement {
        const str = "#"
            + toHex(label.color.x)
            + toHex(label.color.y)
            + toHex(label.color.z);
        return this.createRowColor(label, str);
    }

    private createRowColor(label: Label, colorstr: string): HTMLElement {
        const element = document.createElement("tr");
        element.className = "label-row";
        element.id = "label-row-" + String(label.id);

        const labelRadio = document.createElement("input");
        labelRadio.id = "label-radio-" + String(label.id);
        labelRadio.type = "radio";
        labelRadio.name = "label-radio";
        labelRadio.checked = true;
        labelRadio.value = String(label.id);
        labelRadio.onchange = this.setActiveLabel.bind(this);
        const tdLabelRadio = document.createElement("td");
        tdLabelRadio.append(labelRadio);
        element.append(tdLabelRadio);

        const tdLabelInput = document.createElement("input");
        tdLabelInput.id = "label-input-" + String(label.id);
        tdLabelInput.className = "label-name";
        tdLabelInput.placeholder = "New label";
        tdLabelInput.value = label.name;
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
        tdRemoveBtn.addEventListener("click", this.remove.bind(this, element, label));
        const tdRemove = document.createElement("td");
        tdRemove.setAttribute("style", "background-color: #ff6666;");
        tdRemove.append(tdRemoveBtn)
        element.append(tdRemove);

        return element;
    }

    private remove(element: HTMLElement, pos: Label): void {
        element.remove();
        this.labelManager.removeLabel(pos);
    }

    private updateNames(): void {
        this.labelManager.labels.forEach(pos => {
            const element = document.getElementById("label-input-" + String(pos.id)) as HTMLInputElement | null;
            if (element === null) throw "Could not find label row!";

            pos.name = element.value;
        });
    }

    public getSavedLabelUuid(): string | null {
        return this.uuid;
    }

    public getModelName(): string {
        return this.modelName;
    }
}
