import { isNullOrUndefined } from "util";
import { SavedItem, SavedRegion } from "./labels";
export default class CanvasWrapper {
    material: THREE.MeshPhongMaterial;
    materialTex: THREE.Texture;
    texture: HTMLImageElement;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    constructor(obj: THREE.Object3D) {
        // Lots of type assumptions here...
        const mesh = obj as THREE.Mesh;
        this.material = mesh.material as THREE.MeshPhongMaterial;

        this.canvas = document.createElement("canvas");
        if (isNullOrUndefined(this.material.map)) throw "Missing material map";
        this.texture = this.material.map.image;
        this.materialTex = this.material.map;

        this.canvas.height = this.materialTex.image.height;
        this.canvas.width = this.materialTex.image.width;
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

        this.material.map.image = this.canvas;
        this.draw([]);
    }

    public draw(items: SavedItem[]): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.texture, 0, 0);
        items.forEach(item => {
            if (item instanceof SavedRegion) {
                this.ctx.fillStyle = item.color;
                this.ctx.beginPath();
                this.ctx.ellipse(
                    item.pos.x * this.canvas.width,
                    item.pos.y * this.canvas.height,
                    item.radius,
                    item.radius,
                    0, // rotation
                    0, // start radius
                    2 * Math.PI // end radius
                );
                this.ctx.fill();
            }
        });
        this.materialTex.needsUpdate = true;
        this.material.needsUpdate = true;
    }
}