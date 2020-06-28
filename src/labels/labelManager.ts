import * as THREE from "three";
import { Renderer } from "../renderer";
import { LabelUi } from "./labelUi";
import { binarySearch } from "../utils";
import { Label } from "./Label";
import { Mesh, BufferGeometry } from "three";
import { ModelManager } from "../modelManager";
import { LabelStorage } from "./labelStorage";

export class LabelManager {
    public labels: Label[] = [];
    public renderer: Renderer;
    private userInterface: LabelUi;
    private visible = true;
    private adjacency: number[][] = [];

    constructor(renderer: Renderer, modelName: string, showUi: boolean, showLabels: boolean) {
        this.renderer = renderer;
        this.visible = showLabels;
        this.userInterface = new LabelUi(modelName, this, showUi);
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

        const geo = mesh.geometry as BufferGeometry;
        const vertices = geo.attributes.position.count;
        this.updateAdjacancy(vertices, geo.index?.array as number[]);
    }

    private updateAdjacancy(vertices: number, idx: number[]): void {
        this.adjacency = Array(vertices);
        for (let i = 0; i < vertices; i++) {
            this.adjacency[i] = [];
        }

        for (let i = 0; i < idx.length; i += 3) {
            const v1 = idx[i], v2 = idx[i + 1], v3 = idx[i + 2];
            this.adjacency[v1].push(v2, v3);
            this.adjacency[v2].push(v1, v3);
            this.adjacency[v3].push(v1, v2);
        }
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

        if (this.visible) {
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
        this.visible = visible;
        if (this.visible) {
            this.revisualize();
        } else {
            this.renderer.resetVertexColors();
        }
    }

    public toggleVisibility(): void {
        this.setVisibility(!this.visible);
    }

    public addVerticesToLabel(hit: THREE.Intersection): void {
        if (this.userInterface.activeLabel == null || hit.face == null) return;

        const pos = this.labels
            .find(label => label.id == this.userInterface.activeLabel);
        if (pos == null) return;

        let vertices = [hit.face.a, hit.face.b, hit.face.c];
        for (const v of [hit.face.a, hit.face.b, hit.face.c]) {
            for (const v2 of this.adjacency[v]) {
                vertices.push(v2);
            }
        }

        pos.vertices.sort();
        const vertices2 = [];

        for (let i = this.userInterface.brushSize; i > 1; i--) {
            for (const vertex of vertices) {
                if (binarySearch(pos.vertices, vertex) == null) {
                    vertices2.push(vertex);
                    pos.vertices.push(vertex);
                    pos.vertices.sort();
                }
            }
            vertices = vertices2;
        }

        this.renderer.setColorForVertices(vertices, pos.color);
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

