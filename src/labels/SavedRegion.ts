export class Label {
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
