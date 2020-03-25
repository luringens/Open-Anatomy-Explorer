import * as THREE from "three"
import * as dat from "dat.gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { isNullOrUndefined } from "util";

export class Renderer {
    objectId: string | null = null;
    object: THREE.Object3D | null = null;
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
        this.gui.add(this.ambientLight, "intensity", 0, 5, 0.05)
            .name("Ambient light");
        this.gui.add(this.directionalLight, "intensity", 0, 5, 0.05)
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

            const updateShader = (obj: THREE.Object3D): void => {
                if (obj.type === "Mesh") {
                    const mesh = obj as THREE.Mesh;
                    const material = mesh.material as THREE.ShaderMaterial;
                    material.uniforms.worldLightPosition = {
                        value: this.directionalLight.position
                    };
                    material.needsUpdate = true;
                }

                obj.children.forEach(updateShader);
            };
            updateShader(this.object);

            this.lastMouseClickPosition = p;
            if (!isNullOrUndefined(intersects[0].uv))
                this.lastMouseClickTexturePosition = intersects[0].uv;
        }
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
}
