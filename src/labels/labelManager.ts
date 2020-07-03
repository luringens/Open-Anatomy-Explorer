import * as THREE from "three";
import { Renderer } from "../renderer";
import { LabelUi } from "./labelUi";
import { uniq } from "../utils";
import { Label } from "./Label";
import { Mesh, BufferAttribute, Vector3 } from "three";
import { ModelManager } from "../modelManager";
import { LabelStorage } from "./labelStorage";

export class LabelManager {
    public labels: Label[] = [];
    public renderer: Renderer;
    private userInterface: LabelUi;
    private adjacency: number[][] = [];

    constructor(renderer: Renderer, modelName: string, showUi: boolean, showLabels: boolean) {
        this.renderer = renderer;
        this.userInterface = new LabelUi(modelName, this, showUi);
        this.userInterface.visible = showLabels;
    }

    public getLabel(labelId: number): Label | null {
        return this.labels.find(l => l.id == labelId) ?? null;
    }

    /// Loads labels and orders renderer to load the related model.
    public async loadWithModel(uuid: string, modelName: string | null = null): Promise<void> {
        const labels = await LabelStorage.loadLabelsAsync(uuid);
        if (modelName == null && labels.length < 1) throw "Zero labels in set!";
        const model = modelName ?? labels[0].model;
        const mesh = await ModelManager.loadAsync(model);
        this.renderer.loadObject(mesh);
        this.reset(model, mesh, labels, uuid);
    }

    public reset(modelName: string, mesh: Mesh, labels: Label[] | null = null, uuid: string | null = null): void {
        this.labels.forEach(pos => {
            const id = "label-row-" + String(pos.id);
            const elem = document.getElementById(id) as HTMLElement;
            elem.remove();
        });

        this.labels = labels ?? [];

        this.renderer.resetVertexColors();
        this.userInterface.reload(this.renderer.gui, modelName, labels, uuid);
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

    public toggleVisibility(): void {
        this.setVisibility(!this.userInterface.visible);
    }

    public addVerticesToLabel(hit: THREE.Intersection): void {
        if (this.userInterface.activeLabel == null || hit.face == null) return;

        const label = this.labels
            .find(label => label.id == this.userInterface.activeLabel);
        if (label == null) return;

        const pos = hit.point;
        const radius = this.userInterface.brushSize;
        const geo = this.renderer.getModelGeometry();
        if (geo == null) throw "No model geometry!";

        const posAttr = geo.attributes["position"] as BufferAttribute;
        for (let i = 0; i < posAttr.array.length; i += 3) {
            const vPos = new Vector3(posAttr.array[i], posAttr.array[i + 1], posAttr.array[i + 2]);
            if (pos.distanceTo(vPos) < radius) {
                label.vertices.push(i / 3);
            }
        }

        label.vertices.sort();
        uniq(label.vertices);

        this.renderer.setColorForVertices(label.vertices, label.color);
    }

    public lastClickedLabel(): Label | null {
        const id = this.userInterface.activeLabel;
        if (id == null) return null;
        return this.getLabel(id);
    }

    public getSavedLabelUuid(): string | null {
        return this.userInterface.getSavedLabelUuid();
    }

    public getModelName(): string {
        return this.userInterface.getModelName();
    }

    public setOnActiveLabelChangeHandler(handler: ((label: Label) => void) | null): void {
        this.userInterface.onActiveLabelChangeHandler = handler;
    }

    public moveLightToLabel(label: Label): void {
        const index = Math.floor(Math.random() * (label.vertices.length - 1));
        const vertexId = label.vertices[index];
        this.renderer.moveLightToVertex(vertexId);
    }

    public moveCameraToLabel(label: Label): void {
        const index = Math.floor(Math.random() * (label.vertices.length - 1));
        const vertexId = label.vertices[index];
        this.renderer.moveCameraToVertex(vertexId);
    }
}

