import * as THREE from "three"
import * as dat from "dat.gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Mesh, Vector4, BufferAttribute, BufferGeometry, Vector3, Scene, Object3D } from "three";
import FragmentShader from "./shader.frag";
import VertexShader from "./shader.vert";
import { ActiveTool } from "./activeTool";

export class Renderer {
    private meshes: Mesh[] = [];
    private model: Object3D | null = null;
    private scene: Scene = new THREE.Scene();
    private renderer: THREE.WebGLRenderer;
    private wrapper: HTMLElement;
    private container: HTMLCanvasElement;
    private clickEventHandlers: ((object: THREE.Intersection) => boolean)[] = [];
    private colorBufferAttribute: THREE.BufferAttribute | null = null;

    // For the sake of clean code, these are initiliazed in functions called by
    // the contructor. Unfortunately, TS will not detect their initialization
    // as a result. The exclamation mark squashes this warning :/
    public gui!: dat.GUI;
    private camera!: THREE.PerspectiveCamera;
    private controls!: OrbitControls;
    private ambientLight!: THREE.AmbientLight;
    private directionalLight!: THREE.DirectionalLight;
    private directionalLightHelper!: THREE.DirectionalLightHelper;
    private plane!: THREE.PlaneHelper;
    private planeVisible = true;
    private mouseDown = false;
    private mouseMoveHandler: ((_: THREE.Intersection) => void) | null = null;

    private mouse = new THREE.Vector2();
    private raycaster = new THREE.Raycaster();
    public onClickPosition = new THREE.Vector2();
    public lastMouseClickPosition = new THREE.Vector3();
    public lastMouseClickVerticeIds: [number, number, number] | null = null;

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

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.container.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        this.container.addEventListener('mouseup', this.onMouseUp.bind(this), false);
        this.container.addEventListener('mousemove', this.onMouseMove.bind(this), false);

        (document.getElementById("tool-camera") as HTMLInputElement)
            .onchange = this.onToolChange.bind(this);
        (document.getElementById("tool-picker") as HTMLInputElement)
            .onchange = this.onToolChange.bind(this);
    }

    /// Manages the camera/picker tools.
    private onToolChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
            switch (target.value) {
                case ActiveTool.Camera:
                    this.overrideMouseControls(null);
                    this.toggleCameraControls(true);
                    break;

                case ActiveTool.Picker:
                    this.overrideMouseControls(null);
                    this.toggleCameraControls(false);
                    break;
            }
        }
    }

    public toggleCameraControls(enabled: boolean): void {
        this.controls.enabled = enabled;
    }

    public setColorForVertices(vertices: ArrayLike<number>, color: Vector4): void {
        for (let i = 0; i < vertices.length; i++) {
            const vertexId = vertices[i];
            const val = [
                color.x / 255,
                color.y / 255,
                color.z / 255,
                color.w / 255
            ];
            this.colorBufferAttribute?.set(val, vertexId * 4);
        }

        if (this.meshes != null) this.updateShader(this.meshes);
    }

    public resetColorForVertices(vertexIds: number[]): void {
        for (const vertexId of vertexIds) {
            this.colorBufferAttribute?.set([0], vertexId * 4 + 3);
        }

        if (this.meshes != null) this.updateShader(this.meshes);
    }

    public resetColorForVertex(vertexId: number): void {
        this.colorBufferAttribute?.set([0], vertexId * 4 + 3);
        if (this.meshes != null) this.updateShader(this.meshes);
    }

    public resetVertexColors(): void {
        if (this.colorBufferAttribute == null) return;
        for (let i = 0; i < this.colorBufferAttribute.array.length / 4; i++) {
            this.colorBufferAttribute.setW(i, 0);
        }
        if (this.meshes != null) this.updateShader(this.meshes);
    }

    private setupCamera(): void {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(-300, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
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

    public loadObject(object: Object3D): void {
        // Load shader and stuff
        if (this.model != null) this.scene.remove(this.model);
        this.model = object;
        this.meshes = this.findMeshes(object);
        this.meshes.forEach(mesh => this.setMaterial(mesh));
        this.scene.add(object);

        // Reload GUI
        this.gui.domElement.remove();
        this.gui.destroy();
        this.setupGui();

        // TODO: Find "correct" way to change THREE.js uniforms
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const uniforms = (this.meshes[0].material as any).uniforms;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        this.gui.add(uniforms.ambientIntensity, "value", 0, 10, 0.1)
            .name("Ambient light");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        this.gui.add(uniforms.diffuseIntensity, "value", 0, 10, 0.1)
            .name("Directional light");

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

    public overrideMouseControls(override: ((_: THREE.Intersection) => void) | null): void {
        this.mouseMoveHandler = override;
        this.controls.enabled = override == null;
    }

    private onMouseUp(evt: MouseEvent): void {
        evt.preventDefault();
        this.mouseDown = false;
    }

    private onMouseMove(evt: MouseEvent): void {
        evt.preventDefault();
        if (this.meshes === null) return;
        if (!this.mouseDown || this.mouseMoveHandler == null) return;
        const array = Renderer.getMousePosition(this.container, evt.clientX, evt.clientY);
        this.onClickPosition.fromArray(array);
        const intersects: THREE.Intersection[] =
            this.getIntersects(this.onClickPosition, this.meshes);
        if (intersects.length > 0) this.mouseMoveHandler(intersects[0]);
    }

    private onMouseDown(evt: MouseEvent): void {
        evt.preventDefault();
        this.mouseDown = true;

        // Check if another module has overridden mouse movement
        if (this.mouseMoveHandler != null) {
            return;
        }

        // Don't continue if object is not yet loaded.
        if (this.meshes === null) return;

        const array = Renderer.getMousePosition(this.container, evt.clientX, evt.clientY);
        this.onClickPosition.fromArray(array);

        const intersects: THREE.Intersection[] =
            this.getIntersects(this.onClickPosition, this.meshes);
        if (intersects.length > 0) {
            // Check event handlers
            this.clickEventHandlers.forEach(func => {
                const handled = func(intersects[0]);
                if (handled) return;
            });

            const p = intersects[0].point;
            const face = intersects[0].face;
            if (face === null || face === undefined) return;
            const pUnit = face.normal;
            pUnit.multiplyScalar(25);
            this.moveLight(p, pUnit);

            this.lastMouseClickPosition = p;
            if (intersects[0].face != null) {
                this.lastMouseClickVerticeIds = [
                    intersects[0].face.a,
                    intersects[0].face.b,
                    intersects[0].face.c,
                ];
            }
        }
    }

    private updateShader(meshes: THREE.Mesh[]): void {
        if (this.colorBufferAttribute != null) {
            this.colorBufferAttribute.needsUpdate = true;
        }

        meshes.forEach(mesh => {
            const material = mesh.material as THREE.ShaderMaterial;
            material.uniforms.worldLightPosition = {
                value: this.directionalLight.position
            };
            material.needsUpdate = true;
        });
    }

    private static getMousePosition(dom: HTMLElement, x: number, y: number): number[] {
        const rect = dom.getBoundingClientRect();
        return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
    }

    private getIntersects(point: THREE.Vector2, objects: THREE.Mesh[]): THREE.Intersection[] {
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

    private setMaterial(mesh: Mesh): void {
        let texture = null;
        let useTexture = false;
        if (mesh.material instanceof THREE.MeshStandardMaterial && mesh.material.map != null) {
            texture = mesh.material.map;
            useTexture = true;
        }

        const bufferGeometry = mesh.geometry as BufferGeometry;
        // const verticeCount = bufferGeometry.index?.count ?? 0;
        const verticeCount = bufferGeometry.attributes.position?.count ?? 0;
        const colorBufferItemSize = 4;
        const colorBufferSize = verticeCount * colorBufferItemSize;
        const colorBuffer = new Float32Array(colorBufferSize);
        this.colorBufferAttribute = new BufferAttribute(colorBuffer, colorBufferItemSize);
        bufferGeometry.setAttribute("color", this.colorBufferAttribute);

        mesh.material = new THREE.ShaderMaterial({
            uniforms: {
                worldLightPosition: {
                    value: new THREE.Vector3(0.0, 100.0, 0.0)
                },
                baseColor: {
                    value: new THREE.Vector3(1.0, 1.0, 1.0)
                },
                ambientIntensity: { value: 3.0 },
                specularIntensity: { value: 1.0 },
                diffuseIntensity: { value: 1.0 },
                specularReflection: { value: 0.2 },
                diffuseReflection: { value: 0.2 },
                ambientReflection: { value: 0.2 },
                shininess: { value: 50.0 },
                color: { value: this.colorBufferAttribute },
                texture1: { value: texture },
                useTexture: { value: useTexture }
            },
            vertexShader: VertexShader,
            fragmentShader: FragmentShader,
            name: "custom-material",
        });
    }

    public moveLightToVertex(vId: number): void {
        const [pos, norm] = this.getVertexPosAndNormal(vId);
        const offset = new Vector3().copy(norm).normalize().multiplyScalar(25);
        this.moveLight(pos, offset);
    }

    public moveLightToVertexAverage(vIds: number[]): void {
        const posTotal = new THREE.Vector3();
        const normTotal = new THREE.Vector3();
        for (const vId of vIds) {
            const [pos, norm] = this.getVertexPosAndNormal(vId);
            posTotal.add(pos);
            normTotal.add(norm);
        }
        posTotal.divideScalar(vIds.length);
        normTotal.normalize().multiplyScalar(25);

        this.moveLight(posTotal, normTotal);
    }

    public moveLight(position: Vector3, normal: Vector3): void {
        this.directionalLight.position.set(normal.x, normal.y, normal.z);

        this.scene.remove(this.directionalLightHelper)
        this.directionalLightHelper =
            new THREE.DirectionalLightHelper(this.directionalLight, 10);
        this.scene.add(this.directionalLightHelper);
        this.directionalLight.position.add(position);
        if (this.meshes != null) this.updateShader(this.meshes);
    }

    public moveCameraToVertex(vId: number): void {
        const [pos, norm] = this.getVertexPosAndNormal(vId);
        const offset = new Vector3().copy(norm).normalize().multiplyScalar(50);
        this.moveCamera(offset.add(pos), pos);
    }

    public moveCamera(position: Vector3, lookat: Vector3): void {
        this.camera.position.set(position.x, position.y, position.z);
        this.camera.updateMatrix();
        this.controls.target = lookat;
        this.controls.update();
    }

    private getVertexPosAndNormal(vId: number): [Vector3, Vector3] {
        const geo = this.meshes[0]?.geometry as BufferGeometry;
        const posAttr = geo.attributes["position"] as THREE.BufferAttribute;
        const pos = new Vector3(posAttr.getX(vId), posAttr.getY(vId), posAttr.getZ(vId));
        const normAttr = geo.attributes["normal"] as THREE.BufferAttribute;
        const norm = new Vector3(normAttr.getX(vId), normAttr.getY(vId), normAttr.getZ(vId));
        return [pos, norm];
    }

    public getModelGeometry(): BufferGeometry | null {
        if (this.meshes == null) return null;
        return this.meshes[0]?.geometry as BufferGeometry;
    }

    private findMeshes(scene: Object3D): Mesh[] {
        let meshes = [];
        if (scene.type == "Mesh") meshes.push(scene as Mesh);

        for (const child of scene.children) {
            meshes = meshes.concat(this.findMeshes(child));
        }

        return meshes;
    }
}
