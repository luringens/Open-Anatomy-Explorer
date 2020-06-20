import * as THREE from "three";
import { Renderer } from "../renderer";
import { LabelUi } from "./labelUi";
import { binarySearch } from "../utils";
import { Label } from "./Label";
import { Mesh, BufferGeometry } from "three";

export class LabelManager {
    public labels: Label[] = [];
    public renderer: Renderer;
    private userInterface: LabelUi;
    private visible = true;
    private adjacency: number[][] = [];

    constructor(renderer: Renderer, modelName: string) {
        this.renderer = renderer;
        this.renderer.addClickEventListener(this.clickHandler.bind(this));
        this.userInterface = new LabelUi(modelName, this);
    }

    public reset(modelName: string, mesh: Mesh): void {
        this.labels.forEach(pos => {
            const id = "label-row-" + String(pos.id);
            const elem = document.getElementById(id) as HTMLElement;
            elem.remove();
        });

        this.labels = [];

        this.renderer.resetVertexColors();
        this.userInterface.reload(this.renderer.gui, modelName);

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

    private clickHandler(intersect: THREE.Intersection): boolean {
        if (intersect.face == null) return false;
        const face = intersect.face;
        for (const pos of this.labels) {
            pos.vertices.sort();
            for (const v of [face.a, face.b, face.c]) {
                const idx = binarySearch(pos.vertices, v);
                if (idx != null) {
                    this.userInterface.blinkRowId(pos.id);
                    return true;
                }
            }
        }

        return false;
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

    public toggleVisibility(): void {
        if (this.visible) {
            this.revisualize();
        } else {
            this.renderer.resetVertexColors();
        }
    }

    public addVerticesToLabel(hit: THREE.Intersection): void {
        if (this.userInterface.activeLabel == null || hit.face == null) return;

        const pos = this.labels
            .find(label => label.id == this.userInterface.activeLabel);
        if (pos == null) return;

        const vertices = [hit.face.a, hit.face.b, hit.face.c];
        for (const v of [hit.face.a, hit.face.b, hit.face.c]) {
            for (const v2 of this.adjacency[v]) {
                vertices.push(v2);
            }
        }

        pos.vertices.sort();
        for (let i = this.userInterface.brushSize; i > 1; i--) {
            for (const vertex of vertices) {
                if (binarySearch(pos.vertices, vertex) == null) {
                    vertices.push(vertex);
                    pos.vertices.push(vertex);
                    pos.vertices.sort();
                }
            }
        }

        this.renderer.setColorForVertices(vertices, pos.color);
    }
}
