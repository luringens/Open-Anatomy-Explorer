import { GUI } from "dat.gui";
import { LabelManager } from "./labelManager";
import { Label } from "./Label";
import THREE = require("three");
import { toHex, binarySearch } from "../utils";
import { LabelStorage } from "./labelStorage";
import { ActiveTool } from "../activeTool";
import SVG_EYE from "../../static/eye.svg"
import SVG_EYE_OFF from "../../static/eye-off.svg"

export class LabelUi {
    private listContainer: HTMLElement;
    private labelManager: LabelManager
    private uuid: string | null = null;
    private regionColor = "#FF00FF";
    private regionTransparency = 255;
    private nextLabelId = 1;
    private modelName: string;
    private showUi: boolean;
    public onActiveLabelChangeHandler: ((label: Label) => void) | null = null;
    public activeLabel: null | number = null;
    public lastClickTarget: null | number = null;
    public brushSize = 2;
    public visible = true;

    public constructor(modelName: string, labelManager: LabelManager, showUi: boolean) {
        this.listContainer = document.getElementById("labels") as HTMLElement;
        this.labelManager = labelManager;
        this.modelName = modelName;
        this.showUi = showUi;
        if (showUi) {
            document.getElementById("label-editor")?.classList.remove("hide");
            document.getElementById("tool-group-labeller")?.classList.remove("hide");
            (document.getElementById("tool-labeler") as HTMLInputElement)
                .onchange = this.onToolChange.bind(this);
            (document.getElementById("tool-unlabeler") as HTMLInputElement)
                .onchange = this.onToolChange.bind(this);
        }

        labelManager.renderer.addClickEventListener(this.clickHandler.bind(this));

        const saveRegionButton = document.getElementById("save-region") as HTMLElement;
        saveRegionButton.addEventListener("click", this.savenewLabel.bind(this));

        const saveAllLabelsButton = document.getElementById("labels-save") as HTMLElement;
        saveAllLabelsButton.addEventListener("click", this.storeLabels.bind(this));

        const createQuizButton = document.getElementById("labels-quiz") as HTMLElement;
        createQuizButton.addEventListener("click", this.createQuiz.bind(this));
    }

    private onToolChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
            switch (target.value) {
                case ActiveTool.LabelPainter:
                    this.labelManager.renderer.toggleCameraControls(false);
                    this.labelManager.renderer.overrideMouseControls(
                        this.labelManager.editVerticesForLabel.bind(this.labelManager, true)
                    );
                    break;

                case ActiveTool.LabelUnpainter:
                    this.labelManager.renderer.toggleCameraControls(false);
                    this.labelManager.renderer.overrideMouseControls(
                        this.labelManager.editVerticesForLabel.bind(this.labelManager, false)
                    );
                    break;
            }
        }
    }

    private getSelectedColor(): THREE.Vector4 {
        const color = new THREE.Vector4();
        color.x = parseInt(this.regionColor.slice(1, 3), 16);
        color.y = parseInt(this.regionColor.slice(3, 5), 16);
        color.z = parseInt(this.regionColor.slice(5, 7), 16);
        color.w = this.regionTransparency;
        return color;
    }

    private savenewLabel(): void {
        const vertices = this.labelManager.renderer.lastMouseClickVerticeIds;
        if (vertices == null) return;

        const color = this.getSelectedColor();

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
        this.lastClickTarget = null;
        const face = intersect.face;
        for (const pos of this.labelManager.labels) {
            pos.vertices.sort();
            for (const v of [face.a, face.b, face.c]) {
                const idx = binarySearch(pos.vertices, v);
                if (idx != null) {
                    this.blinkRowId(pos.id);
                    this.activeLabel = pos.id;
                    this.lastClickTarget = pos.id;
                    const e = document.getElementById("label-radio-" + String(pos.id));
                    (e as HTMLInputElement).checked = true;

                    if (this.onActiveLabelChangeHandler != null)
                        this.onActiveLabelChangeHandler(pos);

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

    public reload(gui: GUI, newModelName: string, labels: Label[] | null = null, uuid: string | null = null): void {
        this.uuid = uuid;
        const updateAllLabelsButton = document.getElementById("labels-update") as HTMLElement;
        const deleteAllLabelsButton = document.getElementById("labels-delete") as HTMLElement;
        const createQuizButton = document.getElementById("labels-quiz") as HTMLElement;
        if (this.uuid != null) {
            updateAllLabelsButton.addEventListener("click", this.updateLabels.bind(this));
            deleteAllLabelsButton.addEventListener("click", this.deleteLabels.bind(this));
            updateAllLabelsButton.classList.remove("hide");
            deleteAllLabelsButton.classList.remove("hide");
            createQuizButton.classList.remove("hide");
        }

        if (this.showUi) {
            const f = gui.addFolder("Labelling settings");
            f.addColor(this, "regionColor").name("Region color");
            f.add(this, "regionTransparency", 1, 255, 1).name("Transparency");
            f.add(this, "brushSize", 1, 25, 1).name("Brush size");
            f.open();
        }

        this.modelName = newModelName;

        if (labels != null) {
            this.loadGivenLabels(labels);
        } else if (this.uuid != null) {
            this.loadLabels();
        }
    }

    private loadLabels(): void {
        if (this.uuid == null) {
            alert("No UUID to load!");
            return;
        }

        LabelStorage.loadLabels(this.uuid, this.loadGivenLabels.bind(this));
    }

    public loadGivenLabels(labels: Label[]): void {
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
        const label = this.labelManager.getLabel(Number.parseInt(target.value));
        if (label == null)
            throw `Could not find label with id ${this.activeLabel ?? 0}`;

        if (target.checked) {
            this.activeLabel = label.id;
            this.lastClickTarget = label.id;
            if (this.onActiveLabelChangeHandler != null)
                this.onActiveLabelChangeHandler(label);
        }
    }

    private createRow(label: Label): HTMLElement {
        return this.createRowColor(label, this.colorToHex(label.color));
    }

    public toggleLabelVisible(labelId: number): void {
        const label = this.labelManager.getLabel(labelId);
        if (label === null) return;
        this.setLabelVisible(label, !label.visible);
    }

    public setLabelVisible(label: Label, visible: boolean): void {
        const td = document.getElementById("label-visibility-" + String(label.id));
        if (label === null || td === null) return;

        label.visible = visible;
        td.innerHTML = label.visible ? SVG_EYE : SVG_EYE_OFF;
        this.labelManager.updateLabelVisibility(label);
    }

    public setAllLabelVisible(visible: boolean): void {
        this.labelManager.labels.forEach(label => {
            this.setLabelVisible(label, visible);
        });
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

        const tdlabelVisible = document.createElement("td");
        tdlabelVisible.innerHTML = SVG_EYE;
        tdlabelVisible.id = "label-visibility-" + String(label.id);
        tdlabelVisible.onclick = this.toggleLabelVisible.bind(this, label.id);
        element.append(tdlabelVisible);

        const tdLabelInput = document.createElement("input");
        tdLabelInput.id = "label-input-" + String(label.id);
        tdLabelInput.className = "label-name";
        tdLabelInput.placeholder = "New label";
        tdLabelInput.value = label.name;
        const tdLabel = document.createElement("td");
        tdLabel.append(tdLabelInput);
        element.append(tdLabel);

        const tdColor = document.createElement("td");
        tdColor.setAttribute("style", `background-color: ${colorstr};`);
        tdColor.addEventListener("click", this.updateColor.bind(this, tdColor, label));
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

    private colorToHex(color: THREE.Vector4): string {
        return "#"
            + toHex(color.x)
            + toHex(color.y)
            + toHex(color.z);
    }

    private updateColor(element: HTMLTableCellElement, label: Label): void {
        label.color = this.getSelectedColor();
        const colorstr = this.colorToHex(label.color);
        element.setAttribute("style", `background-color: ${colorstr};`);

        if (this.visible) {
            this.labelManager.renderer.setColorForVertices(label.vertices, label.color);
        }
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

    private createQuiz(): void {
        const origin = window.origin;
        const path = location.pathname;
        window.location.href = `${origin}${path}?labels=${this.uuid ?? ""}&quizaction=create`;
    }
}
