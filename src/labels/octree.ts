/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Vector3 } from "three";
import createTree = require("yaot");

export class Octree {
    private tree: any;

    public constructor(points: ArrayLike<number>) {
        this.tree = (createTree as any)();
        this.tree.init(points);
    }

    public intersectSphere(pos: Vector3, radius: number): number[] {
        return this.tree.intersectTree(pos.x, pos.y, pos.z, radius) as number[];
    }
}
