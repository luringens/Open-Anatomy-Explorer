export class Label {
    /// A list of vertices this label applies to.
    vertices: number[];

    /// The ID number identifying this label.
    id: number;

    /// The color of the label when rendered.
    color: THREE.Vector4;

    // The name of the model the label belongs to.
    model: string;

    /// A user-specified name for the label.
    name: string;

    /// Not stored to database, local state only.
    visible = true;

    constructor(vertices: number[], color: THREE.Vector4, id: number, modelName: string, name = "") {
        this.vertices = vertices;
        this.color = color;
        this.id = id;
        this.name = name;
        this.model = modelName;
    }
}
