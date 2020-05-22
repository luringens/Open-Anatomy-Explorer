import * as THREE from "three"
import * as dat from "dat.gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { isNullOrUndefined } from "util";
import { Object3D, Vector3 } from "three";
import FragmentShader from "./shader.frag";
import VertexShader from "./shader.vert";

export class Renderer {
    objectId: string | null = null;
    private object: THREE.Object3D | null = null;
    scene: THREE.Scene = new THREE.Scene();
    renderer: THREE.WebGLRenderer;
    wrapper: HTMLElement;
    container: HTMLCanvasElement;
    private clickEventHandlers: ((object: THREE.Intersection) => boolean)[] = [];

    // For the sake of clean code, these are initiliazed in functions called by
    // the contructor. Unfortunately, TS will not detect their initialization
    // as a result. The exclamation mark squashes this warning :/
    camera!: THREE.PerspectiveCamera;
    controls!: OrbitControls;
    gui!: dat.GUI;
    ambientLight!: THREE.AmbientLight;
    directionalLight!: THREE.DirectionalLight;
    directionalLightHelper!: THREE.DirectionalLightHelper;
    plane!: THREE.PlaneHelper;
    planeVisible = true;

    mouse = new THREE.Vector2();
    raycaster = new THREE.Raycaster();
    onClickPosition = new THREE.Vector2();
    lastMouseClickPosition = new THREE.Vector3();
    lastMouseClickTexturePosition = new THREE.Vector2();

    private static readonly labelTextureSize = 256;
    private boundingMin = new THREE.Vector3();
    private boundingMax = new THREE.Vector3();
    private labelTextureData: Float32Array;
    private labelTexture: THREE.DataTexture3D;

    public setlabelTexture(tex: THREE.DataTexture3D): void {
        this.labelTexture = tex;
        this.labelTexture.needsUpdate = true;
        if (this.object != null) this.updateShader(this.object);
    }

    public setlabelPosition(pos: Vector3, color: Vector3): void {
        // Find scaled vector v
        const a = pos.clone().sub(this.boundingMin);
        const b = this.boundingMax.clone().sub(this.boundingMin);
        const v = a.clone().divide(b);

        // Calculate array index for vector
        const w = Renderer.labelTextureSize;
        const x = Math.floor(v.x * w);
        const y = Math.floor(v.y * w);
        const z = Math.floor(v.z * w);
        this.drawTextureAt(x, y, z, color);
        this.drawTextureAt(x + 1, y, z, color);
        this.drawTextureAt(x, y + 1, z, color);
        this.drawTextureAt(x, y, z + 1, color);
        this.drawTextureAt(x - 1, y, z, color);
        this.drawTextureAt(x, y - 1, z, color);
        this.drawTextureAt(x, y, z - 1, color);

        this.drawTextureAt(x + 1, y + 1, z, color, 0);
        this.drawTextureAt(x + 1, y - 1, z, color, 0);
        this.drawTextureAt(x - 1, y + 1, z, color, 0);
        this.drawTextureAt(x - 1, y - 1, z, color, 0);
        this.drawTextureAt(x + 1, y + 1, z + 1, color, 0);
        this.drawTextureAt(x + 1, y - 1, z + 1, color, 0);
        this.drawTextureAt(x - 1, y + 1, z + 1, color, 0);
        this.drawTextureAt(x - 1, y - 1, z + 1, color, 0);
        this.drawTextureAt(x + 1, y + 1, z - 1, color, 0);
        this.drawTextureAt(x + 1, y - 1, z - 1, color, 0);
        this.drawTextureAt(x - 1, y + 1, z - 1, color, 0);
        this.drawTextureAt(x - 1, y - 1, z - 1, color, 0);
        this.drawTextureAt(x + 2, y, z, color, 0);
        this.drawTextureAt(x, y + 2, z, color, 0);
        this.drawTextureAt(x, y, z + 2, color, 0);
        this.drawTextureAt(x - 2, y, z, color, 0);
        this.drawTextureAt(x, y - 2, z, color, 0);
        this.drawTextureAt(x, y, z - 2, color, 0);

        this.labelTexture.needsUpdate = true;
        if (this.object != null) this.updateShader(this.object);
    }

    private drawTextureAt(x: number, y: number, z: number, color: Vector3, a = 1): void {
        const w = Renderer.labelTextureSize;
        const xOff = x;
        const yOff = y * w;
        const zOff = z * w * w;
        const i = xOff + yOff + zOff;
        this.labelTextureData[i * 4 + 0] = color.x / 255;
        this.labelTextureData[i * 4 + 1] = color.y / 255;
        this.labelTextureData[i * 4 + 2] = color.z / 255;
        this.labelTextureData[i * 4 + 3] = a;
    }

    public resetlabelTexture(): void {
        for (let i = 0; i < this.labelTextureData.length; i++) {
            this.labelTextureData[i] = 0;
        }
        this.labelTexture.needsUpdate = true;
        if (this.object != null) this.updateShader(this.object);
    }

    constructor(wrapper: HTMLElement) {
        this.wrapper = wrapper;

        const canvas = document.createElement('canvas');
        wrapper.appendChild(canvas);
        const context = canvas.getContext('webgl2', { alpha: false });
        if (context == null) throw "Failed to get WebGL2 context";
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, context: context });

        this.container = this.renderer.domElement;
        this.renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
        wrapper.appendChild(this.container);
        this.setupCamera();
        this.setupLighting();
        this.addDefaultPlane();
        this.setupGui();

        // this.labelTextureData = new Float32Array([
        //     1, 0, 0, 1,
        //     0, 1, 0, 1,
        //     0, 0, 1, 1,
        //     0, 0, 0, 1,
        //     1, 1, 0, 1,
        //     0, 1, 1, 1,
        //     1, 0, 1, 1,
        //     1, 1, 1, 1,
        // ]);
        // this.labelTexture = new THREE.DataTexture3D(
        //     this.labelTextureData, 2, 2, 2
        // );

        const w = Renderer.labelTextureSize;
        this.labelTextureData = new Float32Array(Math.pow(w, 3) * 4);
        this.labelTexture = new THREE.DataTexture3D(
            this.labelTextureData, w, w, w
        );
        this.labelTexture.format = THREE.RGBAFormat;
        this.labelTexture.type = THREE.FloatType;
        this.labelTexture.minFilter = THREE.LinearFilter;
        this.labelTexture.magFilter = THREE.LinearFilter;
        this.labelTexture.unpackAlignment = 1;
        this.labelTexture.needsUpdate = true;

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.container.addEventListener('mousedown', this.onMouseClick.bind(this), false);
    }

    private setupCamera(): void {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(-300, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        // this.controls.maxPolarAngle = Math.PI * 0.5;
        // this.controls.minDistance = 1000;
        // this.controls.maxDistance = 5000;
        this.controls.enableDamping = true;
        this.controls.update();
    }

    private setupLighting(): void {
        // Ambient light.
        this.ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(this.ambientLight);

        // Directional light.
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.color.setHSL(0.5, 1, 1);
        dirLight.position.set(-1, 3, 1);
        dirLight.position.multiplyScalar(30);
        this.scene.add(dirLight);

        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;

        const d = 50;
        dirLight.shadow.camera.left = - d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = - d;
        dirLight.shadow.camera.far = 3500;
        dirLight.shadow.bias = - 0.0001;
        this.directionalLight = dirLight;

        // Indicator for where the light is shining.
        this.directionalLightHelper =
            new THREE.DirectionalLightHelper(dirLight, 10);
        this.scene.add(this.directionalLightHelper);
    }

    private setupGui(): void {
        this.gui = new dat.GUI({ autoPlace: false });
        this.wrapper.prepend(this.gui.domElement);
    }

    public loadObject(obj: Object3D): void {
        // Calculate bounding box
        let boundingMin: Vector3 | null = null;
        let boundingMax: Vector3 | null = null;
        obj.children.forEach((obj) => {
            const bounding = new THREE.Box3().setFromObject(obj);
            if (boundingMin == null) boundingMin = bounding.min;
            else boundingMin.min(bounding.min);
            if (boundingMax == null) boundingMax = bounding.max;
            else boundingMax.min(bounding.max);
        });
        this.boundingMin = boundingMin == null ? new Vector3() : boundingMin;
        this.boundingMax = boundingMax == null ? new Vector3() : boundingMax;

        // Load shader and stuff
        if (this.object != null) this.scene.remove(this.object);
        obj.children.forEach(this.setMaterial.bind(this));
        this.object = obj;
        this.scene.add(obj);

        // Reload GUI
        this.gui.domElement.remove();
        this.gui.destroy();
        this.setupGui();

        {
            const mesh = (this.object.children[0] as THREE.Mesh);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const uniforms = (mesh.material as any).uniforms;
            this.gui.add(uniforms.ambientIntensity, "value", 0, 10, 0.1)
                .name("Ambient light");
            this.gui.add(uniforms.diffuseIntensity, "value", 0, 10, 0.1)
                .name("Directional light");
        }

        const planeVisible = { planeVisible: true };
        const planeVisibleHandler = this.gui.add(planeVisible, "planeVisible")
            .name("Display plane");
        planeVisibleHandler.onChange(this.setPlaneVisibility.bind(this));

        this.planeVisible = true;
    }

    private addDefaultPlane(): void {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100);
        this.plane = new THREE.PlaneHelper(plane, 500, 0xFFFFFF);
        this.scene.add(this.plane);
    }

    private onWindowResize(): void {
        this.camera.aspect = this.wrapper.clientWidth / this.wrapper.clientHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.wrapper.clientWidth, this.wrapper.clientHeight);
    }

    private onMouseClick(evt: MouseEvent): void {
        evt.preventDefault();

        // Don't continue if object is not yet loaded.
        if (this.object === null) return;

        const array = Renderer.getMousePosition(this.container, evt.clientX, evt.clientY);
        this.onClickPosition.fromArray(array);

        const intersects: THREE.Intersection[] =
            this.getIntersects(this.onClickPosition, this.scene.children);
        if (intersects.length > 0) {
            // Check event handlers
            this.clickEventHandlers.forEach(func => {
                const handled = func(intersects[0]);
                if (handled) return;
            });

            const p = intersects[0].point;
            const face = intersects[0].face;
            if (isNullOrUndefined(face)) return;
            const pUnit = face.normal;
            pUnit.multiplyScalar(25);
            this.directionalLight.position.set(pUnit.x, pUnit.y, pUnit.z);

            this.scene.remove(this.directionalLightHelper)
            this.directionalLightHelper =
                new THREE.DirectionalLightHelper(this.directionalLight, 10);
            this.scene.add(this.directionalLightHelper);
            this.directionalLight.position.add(p);

            this.updateShader(this.object);

            this.lastMouseClickPosition = p;
            if (!isNullOrUndefined(intersects[0].uv))
                this.lastMouseClickTexturePosition = intersects[0].uv;
        }
    }

    private updateShader(obj: THREE.Object3D): void {
        if (obj.type === "Mesh") {
            const mesh = obj as THREE.Mesh;
            const material = mesh.material as THREE.ShaderMaterial;
            material.uniforms.labelTexture = {
                value: this.labelTexture
            };
            material.uniforms.worldLightPosition = {
                value: this.directionalLight.position
            };
            material.needsUpdate = true;
        }

        obj.children.forEach(this.updateShader.bind(this));
    }

    private static getMousePosition(dom: HTMLElement, x: number, y: number): number[] {
        const rect = dom.getBoundingClientRect();
        return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
    }

    private getIntersects(point: THREE.Vector2, objects: THREE.Object3D[]): THREE.Intersection[] {
        this.mouse.set((point.x * 2) - 1, - (point.y * 2) + 1);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(objects, true);
    }

    public startRendering(): void {
        // Sets up main rendering loop.
        const animate = (): void => {
            requestAnimationFrame(animate);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        };

        animate();
    }

    public setPlaneVisibility(visible: boolean): void {
        if (visible && !this.planeVisible) {
            this.scene.add(this.plane);
            this.planeVisible = true;
        } else if (!visible && this.planeVisible) {
            this.scene.remove(this.plane);
            this.planeVisible = false;
        }
    }

    // Register a click event handler.
    // It should return "true" if the click has been handled.
    public addClickEventListener(func: (object: THREE.Intersection) => boolean): void {
        this.clickEventHandlers.push(func);
    }

    private setMaterial(obj: Object3D): void {
        const mesh = obj as THREE.Mesh;
        let texture;
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
            texture = mesh.material.map;
        } else {
            texture = THREE.Texture.DEFAULT_IMAGE;
        }

        mesh.material = new THREE.ShaderMaterial({
            uniforms: {
                worldLightPosition: {
                    value: new THREE.Vector3(0.0, 100.0, 0.0)
                },
                baseColor: {
                    value: new THREE.Vector3(1.0, 1.0, 1.0)
                },
                boundingMin: {
                    value: this.boundingMin
                },
                boundingMax: {
                    value: this.boundingMax
                },
                ambientIntensity: { value: 3.0 },
                specularIntensity: { value: 1.0 },
                diffuseIntensity: { value: 1.0 },
                specularReflection: { value: 0.2 },
                diffuseReflection: { value: 0.2 },
                ambientReflection: { value: 0.2 },
                shininess: { value: 50.0 },
                texture1: { type: "t", value: texture },
                labelTexture: { type: "t", value: this.labelTexture },
            },
            vertexShader: VertexShader,
            fragmentShader: FragmentShader,
            name: "custom-material",
        });

        obj.children.forEach(this.setMaterial.bind(this));
    }
}
