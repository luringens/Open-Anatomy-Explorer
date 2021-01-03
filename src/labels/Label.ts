export class Label {
    /// A list of vertices this label applies to.
    vertices: number[];

    /// The ID number identifying this label.
    id: number;

    /// The color of the label when rendered.
    color: THREE.Vector4;

    // The name of the model the label belongs to.
    model: string;

    /// Some models have multiple meshes. This is used to find which mesh the
    /// label vertices belong to.
    meshNumber: number;

    /// A user-specified name for the label.
    name: string;

    constructor(vertices: number[], color: THREE.Vector4, id: number, modelName: string, meshNumber: number, name = "") {
        this.vertices = vertices;
        this.color = color;
        this.id = id;
        this.name = name;
        this.meshNumber = meshNumber;
        this.model = modelName;
    }
}
