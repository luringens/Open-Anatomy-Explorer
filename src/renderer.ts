import * as THREE from "three"
import * as dat from "dat.gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { isNullOrUndefined } from "util";

export class Renderer {
    object: THREE.Object3D | null = null;
    scene: THREE.Scene = new THREE.Scene();
    renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
    wrapper: HTMLElement;
    container: HTMLCanvasElement;

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
    planeVisible: boolean = true;

    mouse = new THREE.Vector2();
    raycaster = new THREE.Raycaster();
    onClickPosition = new THREE.Vector2();
    lastMouseClickPosition = new THREE.Vector3();

    constructor(wrapper: HTMLElement) {
        this.wrapper = wrapper;
        this.container = this.renderer.domElement;
        this.renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
        wrapper.appendChild(this.container);
        this.setupCamera();
        this.setupLighting();
        this.addDefaultPlane();
        this.setupGui();

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.container.addEventListener('mousedown', this.onMouseMove.bind(this), false);
    }

    private setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(-300, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        // this.controls.maxPolarAngle = Math.PI * 0.5;
        // this.controls.minDistance = 1000;
        // this.controls.maxDistance = 5000;
        this.controls.enableDamping = true;
        this.controls.update();
    }

    private setupLighting() {
        // Ambient light.
        this.ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(this.ambientLight);

        // Directional light.
        let dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.color.setHSL(0.5, 1, 1);
        dirLight.position.set(-1, 3, 1);
        dirLight.position.multiplyScalar(30);
        this.scene.add(dirLight);

        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;

        let d = 50;
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

    private setupGui() {
        this.gui = new dat.GUI({ autoPlace: false });
        this.wrapper.prepend(this.gui.domElement);
        this.gui.add(this.ambientLight, "intensity", 0, 5, 0.05)
            .name("Ambient light");
        this.gui.add(this.directionalLight, "intensity", 0, 5, 0.05)
            .name("Directional light");

        let planeVisible = { planeVisible: true };
        let planeVisibleHandler = this.gui.add(planeVisible, "planeVisible")
            .name("Display plane");
        planeVisibleHandler.onChange(this.setPlaneVisibility.bind(this));

        this.planeVisible = true;
    }

    private addDefaultPlane() {
        var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100);
        this.plane = new THREE.PlaneHelper(plane, 500, 0xFFFFFF);
        this.scene.add(this.plane);
    }

    private onWindowResize() {
        this.camera.aspect = this.wrapper.clientWidth / this.wrapper.clientHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.wrapper.clientWidth, this.wrapper.clientHeight);
    }

    private onMouseMove(evt: any) {
        evt.preventDefault();

        // Don't continue if object is not yet loaded.
        if (this.object === null) return;

        var array = Renderer.getMousePosition(this.container, evt.clientX, evt.clientY);
        this.onClickPosition.fromArray(array);

        var intersects: THREE.Intersection[] =
            this.getIntersects(this.onClickPosition, this.object);
        if (intersects.length > 0) {
            let p = intersects[0].point;
            let face = intersects[0].face;
            if (isNullOrUndefined(face)) return;
            let pUnit = face.normal;
            pUnit.multiplyScalar(25);
            this.directionalLight.position.set(p.x, p.y, p.z);
            this.directionalLight.position.add(pUnit);

            this.scene.remove(this.directionalLightHelper)
            this.directionalLightHelper =
                new THREE.DirectionalLightHelper(this.directionalLight, 10);
            this.scene.add(this.directionalLightHelper);

            this.lastMouseClickPosition = p;
        }
    }

    private static getMousePosition(dom: HTMLElement, x: number, y: number) {
        var rect = dom.getBoundingClientRect();
        return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
    }

    private getIntersects(point: THREE.Vector2, object: THREE.Object3D) {
        this.mouse.set((point.x * 2) - 1, - (point.y * 2) + 1);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObject(object, true);
    }

    public startRendering() {
        // Sets up main rendering loop.
        let animate = () => {
            requestAnimationFrame(animate);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        };

        animate();
    }

    public setPlaneVisibility(visible: boolean) {
        if (visible && !this.planeVisible) {
            this.scene.add(this.plane);
            this.planeVisible = true;
        } else if (!visible && this.planeVisible) {
            this.scene.remove(this.plane);
            this.planeVisible = false;
        }
    }
}