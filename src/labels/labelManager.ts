import * as THREE from "three";
import { Renderer } from "../renderer";
import { LabelUi } from "./labelUi";
import { uniq } from "../utils";
import { Label, LabelSet } from "./Label";
import { BufferAttribute, Vector3 } from "three";
import { ModelManager } from "../modelManager";
import Api from "../api";

export class LabelManager {
    public labelSet: LabelSet;
    public labels: Label[];
    public renderer: Renderer;
    public modelManager: ModelManager;
    private userInterface: LabelUi;

    constructor(renderer: Renderer, showUi: boolean, modelId: number, modelManager: ModelManager) {
        this.renderer = renderer;
        this.modelManager = modelManager;
        this.userInterface = new LabelUi(this, showUi);
        this.labelSet = new LabelSet(null, null, modelId, []);
        this.labels = this.labelSet.labels;
    }

    public getLabel(labelId: number): Label | null {
        return this.labels.find(l => l.id == labelId) ?? null;
    }

    /// Loads labels and orders renderer to load the related model.
    public async loadWithModelByUuid(uuid: string): Promise<void> {
        const labelSet = await Api.Labels.loadByUuid(uuid);
        await this.loadWithModel(labelSet);
    }

    /// Loads labels and orders renderer to load the related model.
    public async loadWithModelById(id: number): Promise<void> {
        const labelSet = await Api.Labels.load(id);
        await this.loadWithModel(labelSet);
    }

    private async loadWithModel(labelSet: LabelSet): Promise<void> {
        this.labelSet = labelSet;
        const mesh = await ModelManager.loadAsync(this.labelSet.modelId);
        this.renderer.loadObject(mesh);
        this.reset(this.labelSet);
    }

    public newModel(id: number): void {
        this.reset(new LabelSet(null, null, id, []))
    }

    public reset(set: LabelSet | null = null): void {
        this.labels.forEach(pos => {
            const id = "label-row-" + String(pos.id);
            const elem = document.getElementById(id) as HTMLElement;
            elem.remove();
        });

        if (set != null) {
            this.labelSet = set;
        } else {
            this.labelSet.name = "";
            this.labelSet.labels = [];
            this.labelSet.uuid = null;
        }

        this.labels = this.labelSet.labels;
        this.renderer.resetVertexColors();
        this.userInterface.reload(this.renderer.gui);
    }

    public removeLabel(pos: Label): void {
        let index = -1;
        for (let i = 0; i < this.labels.length; i++) {
            if (this.labels[i].id === pos.id) {
                index = i;
                break;
            }
        }
        if (index === -1) throw "Could not find position in label list.";

        this.labels.splice(index, 1);

        if (this.userInterface.visible) {
            for (const v of pos.vertices) {
                this.renderer.resetColorForVertex(v);
            }
        }
    }

    private revisualize(): void {
        this.renderer.resetVertexColors();
        this.labels.forEach(pos => {
            this.renderer.setColorForVertices(pos.vertices, pos.color);
        });
    }

    public setVisibility(visible: boolean): void {
        this.userInterface.visible = visible;
        if (this.userInterface.visible) {
            this.revisualize();
        } else {
            this.renderer.resetVertexColors();
        }
    }

    /// Toggle visibility of all labels.
    public toggleVisibilityAll(): void {
        this.setVisibility(this.userInterface.visible);
    }

    /// Instruct renderer to render or not render a label as set in label.visibility.
    public updateLabelVisibility(label: Label): void {
        const vertices = label.vertices;
        if (label.visible) this.renderer.setColorForVertices(vertices, label.color);
        else this.renderer.resetColorForVertices(label.vertices);
    }

    /// Add or remove vertices from a label.
    public editVerticesForLabel(add: boolean, hit: THREE.Intersection): void {
        if (this.userInterface.activeLabel == null || hit.face == null) return;

        const label = this.labels
            .find(label => label.id == this.userInterface.activeLabel);
        if (label == null) return;

        const pos = hit.point;
        const radius = this.userInterface.brushSize;
        const geo = this.renderer.getModelGeometry();
        if (geo == null) throw "No model geometry!";

        const posAttr = geo.attributes["position"] as BufferAttribute;
        const vertices = [];
        for (let i = 0; i < posAttr.array.length; i += 3) {
            const vPos = new Vector3(posAttr.array[i], posAttr.array[i + 1], posAttr.array[i + 2]);
            if (pos.distanceTo(vPos) < radius) {
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

    /// Returns the most recent label that was clicked.
    public mostRecentlyClickedLabel(): Label | null {
        const id = this.userInterface.activeLabel;
        if (id == null) return null;
        return this.getLabel(id);
    }

    /// Returns the last click, which is `null` if it did not hit a label.
    public lastClicked(): Label | null {
        const id = this.userInterface.lastClickTarget;
        if (id == null) return null;
        return this.getLabel(id);
    }

    public getSavedLabelUuid(): string | null {
        return this.labelSet?.uuid ?? null;
    }

    public async getModelName(): Promise<string> {
        const modelId = this.labelSet?.modelId ?? null;
        if (modelId == null) return Promise.reject("No modelId!");
        return await Api.modelStorage.lookup(modelId);
    }

    public setOnActiveLabelChangeHandler(handler: ((label: Label) => void) | null): void {
        this.userInterface.onActiveLabelChangeHandler = handler;
    }

    public moveLightToLabel(label: Label): void {
        this.renderer.moveLightToVertexAverage(label.vertices);
    }

    public moveCameraToLabel(label: Label): void {
        const index = Math.floor(Math.random() * (label.vertices.length - 1));
        const vertexId = label.vertices[index];
        this.renderer.moveCameraToVertex(vertexId);
    }
}

