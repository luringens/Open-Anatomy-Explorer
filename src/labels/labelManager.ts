import * as THREE from "three";
import { Renderer } from "../renderer";
import { LabelUi } from "./labelUi";
import { uniq } from "../utils";
import { Label } from "./Label";
import { BufferAttribute, Mesh } from "three";
import { ModelManager } from "../modelManager";
import { LabelStorage } from "./labelStorage";
import { Octree } from "./Octree";

export class LabelManager {
    public labels: Label[] = [];
    public renderer: Renderer;
    private userInterface: LabelUi;
    private octree: Octree | null = null;

    constructor(renderer: Renderer, modelName: string, showUi: boolean, showLabels: boolean) {
        this.renderer = renderer;
        this.userInterface = new LabelUi(modelName, this, showUi);
        this.userInterface.visible = showLabels;
    }

    public getLabel(labelId: number): Label | null {
        return this.labels.find(l => l.id == labelId) ?? null;
    }

    /// Loads labels and ordeenderer to load the related model.
    public async loadWithModel(uuid: string, modelName: string | null = null): Promise<void> {
        const labels = await LabelStorage.loadLabelsAsync(uuid);
        if (modelName == null && labels.length < 1) throw "Zero labels in set!";
        const model = modelName ?? labels[0].model;
        const mesh = await ModelManager.loadAsync(model);
        this.renderer.loadObject(mesh);
        this.reset(model, mesh, labels, uuid);
    }

    public reset(modelName: string, _mesh: Mesh, labels: Label[] | null = null, uuid: string | null = null): void {
        this.labels.forEach(pos => {
            const id = "label-row-" + String(pos.id);
            const elem = document.getElementById(id) as HTMLElement;
            elem.remove();
        });

        this.labels = labels ?? [];

        const geo = this.renderer.getModelGeometry();
        if (geo == null) throw "No model geometry!";
        const posAttr = geo.attributes["position"] as BufferAttribute;
        this.octree = new Octree(posAttr.array)

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

        if (this.octree === null) throw "Octree not initialized";
        const vertices = this.octree.intersectSphere(pos, radius);
        // const posAttr = geo.attributes["position"] as BufferAttribute;
        // const vertices = [];
        // for (let i = 0; i < posAttr.array.length; i += 3) {
        //     const vPos = new Vector3(posAttr.array[i], posAttr.array[i + 1], posAttr.array[i + 2]);
        //     if (pos.distanceTo(vPos) < radius) {
        //         vertices.push(i / 3);
        //     }
        // }

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
        return this.userInterface.getSavedLabelUuid();
    }

    public getModelName(): string {
        return this.userInterface.getModelName();
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

