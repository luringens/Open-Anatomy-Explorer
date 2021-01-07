export class Label {
    /// A list of vertices this label applies to.
    vertices: number[];

    /// The ID number identifying this label.
    id: number;

    /// The color of the label when rendered.
    color: THREE.Vector4;

    /// A user-specified name for the label.
    name: string;

    /// Not stored to database, local state only.
    visible = true;

    constructor(vertices: number[], color: THREE.Vector4, id: number, name = "") {
        this.vertices = vertices;
        this.color = color;
        this.id = id;
        this.name = name;
    }
}

export class LabelSet {
    name: string;
    id: number | null;
    uuid: string | null;
    modelId: number;
    labels: Label[];

    constructor(id: number | null, uuid: string | null, modelId: number, labels: Label[], name = "") {
        this.id = id;
        this.uuid = uuid;
        this.modelId = modelId;
        this.labels = labels;
        this.name = name;
    }
}
