import * as THREE from "three";
import { Renderer } from "../renderer";
import { LabelUi } from "./labelUi";
import { binarySearch } from "../utils";
import { Label } from "./Label";
import { Object3D, Mesh, BufferGeometry } from "three";

export class LabelManager {
    public labels: Label[] = [];
    public renderer: Renderer;
    private userInterface: LabelUi;
    private visible = true;

    constructor(renderer: Renderer, modelName: string) {
        this.renderer = renderer;
        this.renderer.addClickEventListener(this.clickHandler.bind(this));
        this.userInterface = new LabelUi(renderer.gui, modelName, this);
    }

    public reset(modelName: string, object: Object3D): void {
        this.labels.forEach(pos => {
            const id = "label-row-" + String(pos.id);
            const elem = document.getElementById(id) as HTMLElement;
            elem.remove();
        });

        this.labels = [];

        this.renderer.resetVertexColors();
        this.userInterface.reload(this.renderer.gui, modelName);

        const mesh = object.children[0] as Mesh;
        const geo = mesh.geometry as BufferGeometry;
        const vertices = geo.attributes.position.count;
        this.userInterface.updateAdjacancy(vertices, geo.index?.array as number[]);
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

        if (this.visible)
            this.revisualize();
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
}
