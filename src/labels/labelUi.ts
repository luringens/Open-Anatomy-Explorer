import * as THREE from "three";
import { GUI } from "dat.gui";
import LabelManager from "./labelManager";
import { Label, LabelSet } from "./label";
import { toHex, binarySearch, uniq } from "../utils";
import { ActiveTool } from "../activeTool";
import SVG_EYE from "../../static/eye.svg"
import SVG_EYE_OFF from "../../static/eye-off.svg"
import Renderer from "../renderer";

/** 
 * Manages the UI state of the labelling system.
*/
export default class LabelUi {
    private renderer: Renderer;
    private listContainer: HTMLElement;
    private labelSetNameElement: HTMLInputElement;
    private labelManager: LabelManager
    private regionColor = "#FF00FF";
    private regionTransparency = 255;
    private nextLabelId = 1;
    private showUi: boolean;
    public onActiveLabelChangeHandler: ((label: Label) => void) | null = null;
    public activeLabel: null | number = null;
    public lastClickTarget: null | number = null;
    public brushSize = 2;
    public visible = true;

    public constructor(labelManager: LabelManager, renderer: Renderer, showUi: boolean) {
        this.listContainer = document.getElementById("labels") as HTMLElement;
        this.labelManager = labelManager;
        this.renderer = renderer;
        this.showUi = showUi;
        if (showUi) {
            document.getElementById("label-editor")?.classList.remove("hide");
            document.getElementById("tool-group-labeller")?.classList.remove("hide");
            (document.getElementById("tool-labeler") as HTMLInputElement)
                .onchange = this.onToolChange.bind(this);
            (document.getElementById("tool-unlabeler") as HTMLInputElement)
                .onchange = this.onToolChange.bind(this);
        }

        this.labelSetNameElement = document.getElementById("labels-set-name") as HTMLInputElement;

        labelManager.renderer.addClickEventListener(this.clickHandler.bind(this));

        const saveRegionButton = document.getElementById("save-region") as HTMLElement;
        saveRegionButton.addEventListener("click", this.savenewLabel.bind(this));

        const saveAllLabelsButton = document.getElementById("labels-save") as HTMLElement;
        saveAllLabelsButton.addEventListener("click", () => void this.labelManager.storeLabels.bind(this.labelManager)());

        const createQuizButton = document.getElementById("labels-quiz") as HTMLElement;
        createQuizButton.addEventListener("click", this.labelManager.createQuiz.bind(this.labelManager));
    }

    /**
     * Event handler for the radio buttons switching between active tools.
     */
    private onToolChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
            switch (target.value) {
                case ActiveTool.LabelPainter:
                    this.renderer.setCameraControls(false);
                    this.renderer.overrideMouseControls(
                        this.editVerticesForLabel.bind(this, true)
                    );
                    break;

                case ActiveTool.LabelUnpainter:
                    this.renderer.setCameraControls(false);
                    this.renderer.overrideMouseControls(
                        this.editVerticesForLabel.bind(this, false)
                    );
                    break;
            }
        }
    }

    /**
     * Retrieves the parsed colour from the colour selector widget.
     */
    private getSelectedColor(): THREE.Vector4 {
        const color = new THREE.Vector4();
        color.x = parseInt(this.regionColor.slice(1, 3), 16);
        color.y = parseInt(this.regionColor.slice(3, 5), 16);
        color.z = parseInt(this.regionColor.slice(5, 7), 16);
        color.w = this.regionTransparency;
        return color;
    }

    /**
     * Adds a new label, initially only containing the last picked vertex.
     * 
     * To avoid desynchronizing the labels from the rendered model, this will
     * also instruct the model manager to hide the model switching widget.
     */
    private savenewLabel(): void {
        const vertices = this.renderer.lastMouseClickVerticeIds;
        if (vertices == null) return;

        const color = this.getSelectedColor();

        const label = new Label(vertices, color, this.nextLabelId++);
        this.labelManager.labels.push(label);
        this.activeLabel = label.id;

        const element = this.createRow(label);
        this.listContainer.append(element);

        if (this.visible) {
            this.renderer.setColorForVertices(vertices, color);
        }

        this.labelManager.modelManager.setInterfaceVisibility(false);
    }

    /**
     * Handles click events from the renderer.
     * @param intersect The THREE.js click intersection.
     */
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

    /**
     * Adds a short blinking animation to a label in the UI.
     */
    public blinkRowId(id: number): void {
        const element = document.getElementById("label-row-" + String(id));
        if (element === null) throw "Could not find label row!";

        element.classList.add("row-animate");
        window.setTimeout(() => {
            element.classList.remove("row-animate");
        }, 2900);
    }

    /**
     * Clears and reloads the user interface.
     * @param gui The DAT.GUI user interface class.
     * @param populateLabels Whether or not to populate the list of labels.
     */
    public reload(gui: GUI | null = null, populateLabels = true): void {
        const updateAllLabelsButton = document.getElementById("labels-update") as HTMLElement;
        const deleteAllLabelsButton = document.getElementById("labels-delete") as HTMLElement;
        const createQuizButton = document.getElementById("labels-quiz") as HTMLElement;

        if (this.showUi) {
            if (gui != null) {
                const f = gui.addFolder("Labelling settings");
                f.addColor(this, "regionColor").name("Region color");
                f.add(this, "regionTransparency", 1, 255, 1).name("Transparency");
                f.add(this, "brushSize", 1, 25, 1).name("Brush size");
                f.open();
            }

            // Show storage controls beyond just saving if it's already stored.
            if (this.labelManager.labelSet?.uuid != null) {
                updateAllLabelsButton.addEventListener("click", () => void this.labelManager.updateLabels.bind(this.labelManager)());
                deleteAllLabelsButton.addEventListener("click", () => void this.labelManager.deleteLabels.bind(this.labelManager)());
                updateAllLabelsButton.classList.remove("hide");
                deleteAllLabelsButton.classList.remove("hide");
                createQuizButton.classList.remove("hide");

            } else {
                updateAllLabelsButton.classList.add("hide");
                deleteAllLabelsButton.classList.add("hide");
                createQuizButton.classList.add("hide");
            }
        }

        if (this.labelManager.labels.length > 0) {
            this.labelManager.modelManager.setInterfaceVisibility(false);
        }

        if (populateLabels && this.labelManager.labelSet != null) {
            this.loadGivenLabels(this.labelManager.labelSet);
        }
    }

    /**
     * Loads a list of labels and renders them to the user interface and model.
     */
    public loadGivenLabels(set: LabelSet): void {
        this.labelSetNameElement.value = set.name;
        this.labelManager.labelSet = set;
        this.labelManager.labels = set.labels;
        set.labels.forEach(label => {
            const element = this.createRow(label);
            this.listContainer.append(element);
            if (this.visible)
                this.renderer.setColorForVertices(label.vertices, label.color);
            this.nextLabelId = Math.max(this.nextLabelId, label.id + 1);
        });
    }

    /**
     * Event handler for the radio buttons picking an "active" label.
     * The "active label" is used to determine which label is being painted, etc.
     */
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

    /**
     * Toggles the visibility for a specific label.
     */
    public toggleLabelVisible(labelId: number): void {
        const label = this.labelManager.getLabel(labelId);
        if (label === null) return;
        this.setLabelVisible(label, !label.visible);
    }

    /**
     * Sets the visibility for a specific label.
     */
    public setLabelVisible(label: Label, visible: boolean): void {
        const td = document.getElementById("label-visibility-" + String(label.id));
        if (label === null || td === null) return;

        label.visible = visible;
        td.innerHTML = label.visible ? SVG_EYE : SVG_EYE_OFF;
        this.updateLabelVisibility(label);
    }

    /**
     * Sets the visibility of all labels.
     */
    public setAllLabelVisible(visible: boolean): void {
        this.labelManager.labels.forEach(label => {
            this.setLabelVisible(label, visible);
        });
    }

    /**
     * Creates a row in the label table for a label.
     * @param label The label to create a user interface element for.
     */
    private createRow(label: Label): HTMLElement {
        const colorstr = this.colorToHexRgb(label.color);
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
        tdColor.className = "label-color";
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

    /**
     * Converts a Vector4 to a RGB colour, discarding the alpha.
     */
    private colorToHexRgb(color: THREE.Vector4): string {
        return "#"
            + toHex(color.x)
            + toHex(color.y)
            + toHex(color.z);
    }

    /**
     * Updates the colour of a label and it's interface element.
     */
    private updateColor(element: HTMLTableCellElement, label: Label): void {
        label.color = this.getSelectedColor();
        const colorstr = this.colorToHexRgb(label.color);
        element.setAttribute("style", `background-color: ${colorstr};`);

        if (this.visible) {
            this.renderer.setColorForVertices(label.vertices, label.color);
        }
    }

    /**
     * Removes a given html element and label.
     */
    private remove(element: HTMLElement, pos: Label): void {
        element.remove();
        this.labelManager.removeLabel(pos);
    }

    /**
     * Updated the in-memory representation of the labels to match the user interface state.
     */
    public updateFromUi(): void {
        this.labelManager.labelSet.name = this.labelSetNameElement.value;

        this.labelManager.labels.forEach(pos => {
            const element = document.getElementById("label-input-" + String(pos.id)) as HTMLInputElement | null;
            if (element === null) throw "Could not find label row!";

            pos.name = element.value;
        });
    }

    /**
     * Re-paints the labels onto the model.
     */
    private revisualize(): void {
        this.renderer.resetVertexColors();
        this.labelManager.labels.forEach(pos => {
            this.renderer.setColorForVertices(pos.vertices, pos.color);
        });
    }

    /**
     * Show or hide the visibility of all labels in the UI.
     */
    public setVisibility(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.revisualize();
        } else {
            this.renderer.resetVertexColors();
        }
    }

    /**
     * Renders or hides a label as set in it's label.visibility property.
     */
    private updateLabelVisibility(label: Label): void {
        const vertices = label.vertices;
        if (label.visible) this.renderer.setColorForVertices(vertices, label.color);
        else this.renderer.resetColorForVertices(label.vertices);
    }

    /**
     * Add or remove vertices from a label.
     * @param add Set to `true` to add the vertex to the label, `false` to remove it.
     * @param hit The THREE.Intersection from the click event.
     */
    private editVerticesForLabel(add: boolean, hit: THREE.Intersection): void {
        if (this.activeLabel == null || hit.face == null) return;

        const label = this.labelManager.labels
            .find(label => label.id == this.activeLabel);
        if (label == null) return;

        const pos = hit.point;
        const radius = this.brushSize;
        const geo = this.renderer.getModelGeometry();
        if (geo == null) throw "No model geometry!";

        const posAttr = geo.attributes["position"] as THREE.BufferAttribute;
        const vertices = [];
        for (let i = 0; i < posAttr.array.length; i += 3) {
            const x2 = Math.pow(pos.x - posAttr.array[i], 2);
            const y2 = Math.pow(pos.y - posAttr.array[i + 1], 2);
            const z2 = Math.pow(pos.z - posAttr.array[i + 2], 2);
            const dist = Math.sqrt(x2 + y2 + z2);

            if (dist < radius) {
                vertices.push(i / 3);
            }
        }

        if (add) {
            label.vertices = label.vertices.concat(vertices);
            label.vertices.sort();
            uniq(label.vertices);
        } else {
            this.renderer.resetColorForVertices(label.vertices);
            const setFilter = new Set(vertices);
            label.vertices = label.vertices.filter(v => !setFilter.has(v));
        }

        this.renderer.setColorForVertices(label.vertices, label.color);
    }
}
