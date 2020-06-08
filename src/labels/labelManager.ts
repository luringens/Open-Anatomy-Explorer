import * as THREE from "three";
import { Renderer } from "../renderer";
import { LabelUi } from "./labelUi";
import { binarySearch } from "../utils";

export class LabelManager {
    public positions: SavedRegion[] = [];
    public renderer: Renderer;
    private userInterface: LabelUi;
    private visible = true;

    constructor(renderer: Renderer, modelName: string) {
        this.renderer = renderer;
        this.renderer.addClickEventListener(this.clickHandler.bind(this));
        this.userInterface = new LabelUi(renderer.gui, modelName, this);
    }

    public reset(modelName: string): void {
        this.positions.forEach(pos => {
            const id = "label-row-" + String(pos.id);
            const elem = document.getElementById(id) as HTMLElement;
            elem.remove();
        });

        this.positions = [];

        this.renderer.resetVertexColors();
        this.userInterface.reload(this.renderer.gui, modelName);
    }

    private clickHandler(intersect: THREE.Intersection): boolean {
        if (intersect.face == null) return false;
        const face = intersect.face;
        for (const pos of this.positions) {
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

    public removeLabel(pos: SavedRegion): void {
        let index = -1;
        for (let i = 0; i < this.positions.length; i++) {
            if (this.positions[i].id === pos.id) {
                index = i;
                break;
            }
        }
        if (index === -1) throw "Could not find position in label list.";

        this.positions.splice(index, 1);

        if (this.visible)
            this.revisualize();
    }

    private revisualize(): void {
        this.renderer.resetVertexColors();
        this.positions.forEach(pos => {
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

export class SavedRegion {
    vertices: number[];
    id: number;
    color: THREE.Vector3;
    model: string;
    name: string;

    constructor(vertices: number[], color: THREE.Vector3, id: number, modelName: string, name = "") {
        this.vertices = vertices;
        this.color = color;
        this.id = id;
        this.name = name;
        this.model = modelName;
    }
}
