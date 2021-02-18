import * as THREE from "three"
import * as dat from "dat.gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Mesh, Vector4, BufferAttribute, BufferGeometry, Vector3, Scene, Object3D } from "three";
import FragmentShader from "./shader.frag";
import VertexShader from "./shader.vert";
import { ActiveTool } from "./activeTool";

/**
 * Main renderer for the project.
 */
export default class Renderer {
    private meshes: Mesh[] = [];
    private model: Object3D | null = null;
    private scene: Scene = new THREE.Scene();
    private renderer: THREE.WebGLRenderer;
    private wrapper: HTMLElement;
    private container: HTMLCanvasElement;
    private clickEventHandlers: ((object: THREE.Intersection) => boolean)[] = [];
    private colorBufferAttribute: THREE.BufferAttribute | null = null;

    private camera: THREE.PerspectiveCamera;
    private controls: OrbitControls;
    public gui: dat.GUI;

    private ambientLight!: THREE.AmbientLight;
    private directionalLight!: THREE.DirectionalLight;
    private directionalLightHelper!: THREE.DirectionalLightHelper;

    private plane: THREE.PlaneHelper;
    private planeVisible = true;

    private mouse = new THREE.Vector2();
    private mouseDown = false;
    private mouseMoveHandler: ((_: THREE.Intersection) => void) | null = null;

    private raycaster = new THREE.Raycaster();

    public onClickPosition = new THREE.Vector2();
    public lastMouseClickPosition = new THREE.Vector3();
    public lastMouseClickVerticeIds: [number, number, number] | null = null;

    constructor(wrapper: HTMLElement) {
        this.wrapper = wrapper;

        // Create the WebGL context.
        const canvas = document.createElement('canvas');
        wrapper.appendChild(canvas);
        const context = canvas.getContext('webgl2', { alpha: false });
        if (context == null) throw "Failed to get WebGL2 context";

        // Initalize THREE.js' rendering engine.
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, context: context });
        this.container = this.renderer.domElement;
        this.renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
        wrapper.appendChild(this.container);

        // Set up the camera and camera controls.
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(-300, 0, 0);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.update();

        // Set up the lighting for the scene, as well as an indicator for where
        // the light source is positioned.
        this.ambientLight = new THREE.AmbientLight();
        this.directionalLight = new THREE.DirectionalLight();
        this.setupLighting();
        this.directionalLightHelper = new THREE.DirectionalLightHelper(this.directionalLight, 10);
        this.scene.add(this.directionalLightHelper);

        // Add a viewable plane to the scene as a point of reference to keep
        // track of the orientation of the model.
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100);
        this.plane = new THREE.PlaneHelper(plane, 500, 0xFFFFFF);
        this.scene.add(this.plane);

        // Set up the in-renderer UI, which is *mostly* used for managing
        // lighting settings and renderer attributes.
        this.gui = new dat.GUI({ autoPlace: false });
        this.wrapper.prepend(this.gui.domElement);

        // Handle window resizing.
        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        // Bind mouse input events so we can use it for various purposes later.
        this.container.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        this.container.addEventListener('mouseup', this.onMouseUp.bind(this), false);
        this.container.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        this.container.addEventListener('keydown', this.keydown.bind(this), false);

        // Bind the camera tool radio-buttons to our handling function.
        (document.getElementById("tool-camera") as HTMLInputElement)
            .onchange = this.onToolChange.bind(this);
        (document.getElementById("tool-picker") as HTMLInputElement)
            .onchange = this.onToolChange.bind(this);
    }

    /**
     * Configures the lighting for the scene.
     * Assumes this.directionalLighting and this.ambientLighting is initialized.
     */
    private setupLighting(): void {
        // Ambient light.
        this.ambientLight.color.setHSL(0, 0, 0.25);
        this.scene.add(this.ambientLight);

        // Directional light.
        const dirLight = this.directionalLight;
        dirLight.color.setHSL(0, 1, 1);
        dirLight.intensity = 1.2;
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
    }

    /**
     * Event handler for the radio buttons switching between active tools.
     */
    private onToolChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
            switch (target.value) {
                case ActiveTool.Camera:
                    this.overrideMouseControls(null);
                    this.setCameraControls(true);
                    break;

                case ActiveTool.Picker:
                    this.overrideMouseControls(null);
                    this.setCameraControls(false);
                    break;
            }
        }
    }


    /**
     * Event handler for keyboard input to the canvas.
     */
    private keydown(event: KeyboardEvent): void {
        const camera = document.getElementById("tool-camera") as HTMLInputElement;
        const picker = document.getElementById("tool-picker") as HTMLInputElement;
        const labeller = document.getElementById("tool-labeler") as HTMLInputElement;
        const unlabeller = document.getElementById("tool-unlabeler") as HTMLInputElement;
        const labelgroup = document.getElementById("tool-group-labeler") as HTMLDivElement;
        const labelgroupVisible = !labelgroup.classList.contains("hide");

        switch (event.key) {
            case "q": camera.click(); break;
            case "w": picker.click(); break;
            case "e": if (labelgroupVisible) { labeller.click(); } break;
            case "r": if (labelgroupVisible) { unlabeller.click(); } break;
            default: break;
        }
    }

    /**
     * Enable or disable the camera controls.
     */
    public setCameraControls(enabled: boolean): void {
        this.controls.enabled = enabled;
    }

    /**
     * Paints a colour to a set of vertices, using the alpha for blending.
     * @param vertices The vertices to apply the colour to.
     * @param color The RGBA colour to apply.
     */
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

    /**
     * Remove the painted colour for a set of vertices.
     */
    public resetColorForVertices(vertexIds: number[]): void {
        for (const vertexId of vertexIds) {
            this.colorBufferAttribute?.set([0], vertexId * 4 + 3);
        }

        if (this.meshes != null) this.updateShader(this.meshes);
    }

    /**
     * Reset the painted colour for a specific vertex.
     */
    public resetColorForVertex(vertexId: number): void {
        this.colorBufferAttribute?.set([0], vertexId * 4 + 3);
        if (this.meshes != null) this.updateShader(this.meshes);
    }

    /**
     * Resets the painted colour for all vertices.
     */
    public resetVertexColors(): void {
        if (this.colorBufferAttribute == null) return;
        for (let i = 0; i < this.colorBufferAttribute.array.length / 4; i++) {
            this.colorBufferAttribute.setW(i, 0);
        }
        if (this.meshes != null) this.updateShader(this.meshes);
    }

    /**
     * Load an object into the scene and apply shader magic, removing all previous models.
     */
    public loadObject(object: Object3D): void {
        // Override the material of all meshes with a custom shader.
        if (this.model != null) this.scene.remove(this.model);
        this.model = object;
        this.meshes = this.findMeshes(object);
        this.meshes.forEach(mesh => this.setMaterial(mesh));
        this.scene.add(object);

        // Reload GUI
        this.gui.domElement.remove();
        this.gui.destroy();
        this.gui = new dat.GUI({ autoPlace: false });
        this.wrapper.prepend(this.gui.domElement);

        // Set the shader uniforms.
        // TODO: Find "correct" way to change THREE.js uniforms.
        // This is an undocumented API and prevents me from upgrading to a newer
        // version of THREE.js :(
        {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const uniforms = (this.meshes[0].material as any).uniforms;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            this.gui.add(uniforms.ambientIntensity, "value", 0, 10, 0.1)
                .name("Ambient light");
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            this.gui.add(uniforms.diffuseIntensity, "value", 0, 10, 0.1)
                .name("Directional light");
        }

        const planeVisible = { planeVisible: true };
        const planeVisibleHandler = this.gui.add(planeVisible, "planeVisible")
            .name("Display plane");
        planeVisibleHandler.onChange(this.setPlaneVisibility.bind(this));

        this.planeVisible = true;
    }

    /**
     * Event handler for the window being resized.
     * Adjusts the camera projection matrix to keep the aspect sensible.
     */
    private onWindowResize(): void {
        this.camera.aspect = this.wrapper.clientWidth / this.wrapper.clientHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.wrapper.clientWidth, this.wrapper.clientHeight);
    }

    /**
     * Sets or removes a mouse control override. When set, instead of the mouse
     * moving the camera, selecting vertices, etc., it will call the provided
     * callback function.
     * @param override The function to call on mouse clicks.
     */
    public overrideMouseControls(override: ((_: THREE.Intersection) => void) | null): void {
        this.mouseMoveHandler = override;
        this.controls.enabled = override == null;
    }

    /**
     * Event handler for releasing the mouse.
     */
    private onMouseUp(evt: MouseEvent): void {
        evt.preventDefault();
        this.mouseDown = false;
    }

    /**
     * Event handler for moving the mouse.
     */
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

    /**
     * Event handler for pressing the mouse button.
     */
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

    /**
     * Updates shader attributes for a list of meshes.
     * @param meshes the meshes to update the shader for.
     */
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

    /**
     * Gets the mouse position 
     * @param dom The DOM element to get the mouse position within
     * @param x The screen-space mouse X position.
     * @param y The screen-space mouse Y position.
     * @returns The X and Y coordinates of the mouse within the DOM element.
     */
    private static getMousePosition(dom: HTMLElement, x: number, y: number): [number, number] {
        const rect = dom.getBoundingClientRect();
        return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
    }

    /**
     * Finds intersections between a mouse click and meshes in the scene.
     * @param point The mouse click position within the canvas.
     * @param objects A list of meshes to test for intersections on.
     */
    private getIntersects(point: THREE.Vector2, objects: THREE.Mesh[]): THREE.Intersection[] {
        this.mouse.set((point.x * 2) - 1, - (point.y * 2) + 1);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(objects, true);
    }

    /**
     * Starts the main rendering loop.
     */
    public startRendering(): void {
        // Sets up main rendering loop.
        const animate = (): void => {
            requestAnimationFrame(animate);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        };

        animate();
    }

    /**
     * Sets the visibility of the helper plane.
     */
    public setPlaneVisibility(visible: boolean): void {
        if (visible && !this.planeVisible) {
            this.scene.add(this.plane);
            this.planeVisible = true;
        } else if (!visible && this.planeVisible) {
            this.scene.remove(this.plane);
            this.planeVisible = false;
        }
    }

    /**
     * Registers a click event handler.
     * @param func Click event handler to call when clicks are made. Should
     * return a boolean indicating whether or not the click was handled. When a
     * click is handled, no further camera movement etc. is done using that
     * input.
     */
    public addClickEventListener(func: (_: THREE.Intersection) => boolean): void {
        this.clickEventHandlers.push(func);
    }

    /**
     * Sets the custom material and shader for a mesh.
     * @param mesh The mesh to set the material for.
     */
    private setMaterial(mesh: Mesh): void {
        let texture = null;
        let useTexture = false;
        let useVertexColor = false;
        const bufferGeometry = mesh.geometry as BufferGeometry;

        // Note down existing texture or vertex color if present.
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
            if (mesh.material.map != null) {
                texture = mesh.material.map;
                useTexture = true;
            } else if (mesh.material.vertexColors) {
                useVertexColor = true;
            }
        }

        // const verticeCount = bufferGeometry.index?.count ?? 0;
        const verticeCount = bufferGeometry.attributes.position?.count ?? 0;
        const colorBufferItemSize = 4;
        const colorBufferSize = verticeCount * colorBufferItemSize;
        const colorBuffer = new Float32Array(colorBufferSize);
        this.colorBufferAttribute = new BufferAttribute(colorBuffer, colorBufferItemSize);
        bufferGeometry.setAttribute("labelColorIn", this.colorBufferAttribute);

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
                useTexture: { value: useTexture },
                useVertexColor: { value: useVertexColor },
            },
            vertexShader: VertexShader,
            fragmentShader: FragmentShader,
            name: "custom-material",
        });
    }

    /**
     * Moves the light to point at the rough center of a list of vertexes.
     */
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

    /**
     * Moves the camera to a specified position, looking in a specified direction.
     */
    public moveLight(position: Vector3, normal: Vector3): void {
        this.directionalLight.position.set(normal.x, normal.y, normal.z);

        this.scene.remove(this.directionalLightHelper)
        this.directionalLightHelper =
            new THREE.DirectionalLightHelper(this.directionalLight, 10);
        this.scene.add(this.directionalLightHelper);
        this.directionalLight.position.add(position);
        if (this.meshes != null) this.updateShader(this.meshes);
    }

    /**
     * Moves the camera to look at a specific vertex.
     */
    public moveCameraToVertex(vId: number, distance = 50): void {
        const [pos, norm] = this.getVertexPosAndNormal(vId);
        const offset = new Vector3().copy(norm).normalize().multiplyScalar(distance);
        this.moveCamera(offset.add(pos), pos);
    }

    /**
     * Moves the camera to a specified position, pointing at another position.
     * @param position The position the camera should be placed at.
     * @param lookat The position the camera should point towards.
     */
    public moveCamera(position: Vector3, lookat: Vector3): void {
        this.camera.position.set(position.x, position.y, position.z);
        this.camera.updateMatrix();
        this.controls.target = lookat;
        this.controls.update();
    }

    /**
     * Gets the vertex coordinates and normal vector for the specified vertex index.
     */
    private getVertexPosAndNormal(vId: number): [Vector3, Vector3] {
        const geo = this.meshes[0]?.geometry as BufferGeometry;
        const posAttr = geo.attributes["position"] as THREE.BufferAttribute;
        const pos = new Vector3(posAttr.getX(vId), posAttr.getY(vId), posAttr.getZ(vId));
        const normAttr = geo.attributes["normal"] as THREE.BufferAttribute;
        const norm = new Vector3(normAttr.getX(vId), normAttr.getY(vId), normAttr.getZ(vId));
        return [pos, norm];
    }

    /**
     * Gets the geometry of the currently loaded model, if there is one.
     */
    public getModelGeometry(): BufferGeometry | null {
        if (this.meshes == null) return null;
        return this.meshes[0]?.geometry as BufferGeometry;
    }

    /**
     * Finds all meshes present in a scene.
     */
    private findMeshes(scene: Object3D): Mesh[] {
        let meshes = [];
        if (scene.type == "Mesh") meshes.push(scene as Mesh);

        for (const child of scene.children) {
            meshes = meshes.concat(this.findMeshes(child));
        }

        return meshes;
    }
}
