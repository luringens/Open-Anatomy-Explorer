import { Object3D, Mesh } from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export class ModelManager {
  private static readonly url = "http://51.15.231.127:5000/models/";

  private static findMesh(objs: Object3D[]): Mesh | null {
    for (const obj of objs) {
      if (obj.type == "Mesh") return obj as Mesh;

      const childMesh = ModelManager.findMesh(obj.children);
      if (childMesh != null) return childMesh;
    }
    return null;
  }

  public static async load(name: string, callback: (_: Mesh) => void): Promise<Mesh> {
    const gltf = await new GLTFLoader().loadAsync(this.url + name);
    const mesh = this.findMesh(gltf.scene.children);
    if (mesh == null) return Promise.reject("Could not find mesh");
    return mesh;
  }

  public static async loadAsync(name: string): Promise<Mesh> {
    const url = this.url;
    return new Promise(function (resolve, reject) {
      new GLTFLoader().load(
        url + name,
        (gltf: GLTF) => {
          const mesh = ModelManager.findMesh(gltf.scene.children);
          if (mesh == null) reject("Could not find mesh");
          else resolve(mesh);
        },
        undefined,
        (error) => console.error(error),
      );
    });
  }

  public static async getModelList(): Promise<string[]> {
    const data = await fetch(ModelManager.url)
    return data.json();
  }
}
