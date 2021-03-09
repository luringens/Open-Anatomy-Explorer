import Renderer from "../renderer";
import LabelUi from "./labelUi";
import { Label, LabelSet } from "./label";
import { ModelManager } from "../modelManager";
import LabelApi from "../Api/labelset";
import LabelsetApi from "../Api/labelset";
import { HashAddress, HashAddressType } from "../hashAddress";

/**
 * Manages a set of labels and their state.
 */
export default class LabelManager {
    public labelSet: LabelSet;
    public labels: Label[];
    public renderer: Renderer;
    public modelManager: ModelManager;
    private userInterface: LabelUi;

    constructor(renderer: Renderer, showUi: boolean, modelId: number, modelManager: ModelManager) {
        this.renderer = renderer;
        this.modelManager = modelManager;
        this.userInterface = new LabelUi(this, renderer, showUi);
        this.labelSet = new LabelSet(null, null, modelId, []);
        this.labels = this.labelSet.labels;
    }

    /**
     * Gets a label by it's ID.
     */
    public getLabel(labelId: number): Label | null {
        return this.labels.find(l => l.id == labelId) ?? null;
    }

    /**
     * Loads a label set by it's UUID, and then orders the renderer to load the
     * model the set belongs to.
     */
    public async loadWithModelByUuid(uuid: string): Promise<void> {
        const labelSet = await LabelApi.loadByUuid(uuid);
        await this.loadWithModel(labelSet);
    }

    /**
     * Loads a label set by it's ID, and then orders the renderer to load the
     * model the set belongs to.
     */
    public async loadWithModelById(id: number): Promise<void> {
        const labelSet = await LabelApi.load(id);
        await this.loadWithModel(labelSet);
    }

    /**
     * Loads the given labelset, and then orders the renderer to load the model
     * the set belongs to.
     */
    private async loadWithModel(labelSet: LabelSet): Promise<void> {
        this.labelSet = labelSet;
        const mesh = await this.modelManager.loadAsync(this.labelSet.modelId);
        this.renderer.loadObject(mesh);
        this.reset(this.labelSet);
    }

    /**
     * Informs the LabelManager that a new model has been loaded and to reset
     * its wordlview accordingly. Notably by clearing the loaded labelset.
     * @param id The model ID of the new model.
     */
    public newModel(id: number): void {
        this.reset(new LabelSet(null, null, id, []))
    }

    /**
     * Resets the LabelManager state.
     * @param set A labelset to use afterwards, or null to start from a clean slate.
     */
    public reset(set: LabelSet | null = null): void {
        this.labels.forEach(pos => {
            const id = "label-row-" + String(pos.id);
            const elem = document.getElementById(id) as HTMLElement;
            elem.remove();
        });

        if (set != null) {
            this.labelSet = set;
        } else {
            this.labelSet.name = "";
            this.labelSet.labels = [];
            this.labelSet.uuid = null;
        }

        this.labels = this.labelSet.labels;
        this.renderer.resetVertexColors();
        this.userInterface.reload(this.renderer.gui);
    }

    /**
     * Remove a label from the set.
     */
    public removeLabel(pos: Label): void {
        let index = -1;
        for (let i = 0; i < this.labels.length; i++) {
            if (this.labels[i].id === pos.id) {
                index = i;
                break;
            }
        }
        if (index === -1) throw "Could not find position in label list.";

        this.labels.splice(index, 1);

        if (this.userInterface.visible) {
            for (const v of pos.vertices) {
                this.renderer.resetColorForVertex(v);
            }
        }
    }

    /**
     * Show or hide all labels.
     */
    public setVisibility(visible: boolean): void {
        this.userInterface.setVisibility(visible);
    }

    /**
     * Returns the label that was most recently clicked on.
     */
    public mostRecentlyClickedLabel(): Label | null {
        const id = this.userInterface.activeLabel;
        if (id == null) return null;
        return this.getLabel(id);
    }

    /**
     * Returns the label the most recent click hit, or null if it did not click on a label.
     */
    public lastClicked(): Label | null {
        const id = this.userInterface.lastClickTarget;
        if (id == null) return null;
        return this.getLabel(id);
    }

    /**
     * Get the stored UUID of the albelset in use if there is one.
     */
    public getSavedLabelUuid(): string | null {
        return this.labelSet?.uuid ?? null;
    }

    /**
     * Sets a callback to call every time the selected label changes.
     */
    public setOnActiveLabelChangeHandler(handler: ((label: Label) => void) | null): void {
        this.userInterface.onActiveLabelChangeHandler = handler;
    }

    /**
     * Moves the light fixture to the selected label.
     */
    public moveLightToLabel(label: Label): void {
        this.renderer.moveLightToVertexAverage(label.vertices);
    }

    /**
     * Moves the camera to the selected label.
     */
    public moveCameraToLabel(label: Label): void {
        const index = Math.floor(Math.random() * (label.vertices.length - 1));
        const vertexId = label.vertices[index];
        this.renderer.moveCameraToVertex(vertexId);
    }

    /**
     * Stores the current labels as a new labelset on the server.
     */
    public async storeLabels(): Promise<void> {
        if (this.labelSet == null) return Promise.reject("No labels to store");
        this.userInterface.updateFromUi();
        const uuid = await LabelsetApi.post(this.labelSet);
        this.labelSet.uuid = uuid;
        this.userInterface.reload(null, false);

        new HashAddress(uuid, HashAddressType.Label).set();
    }

    /**
     * Stores the current labels as a new labelset on the server, overwriting previous data.
     */
    public async updateLabels(): Promise<void> {
        if (this.labelSet == null) return Promise.reject("No labels to store");
        this.userInterface.updateFromUi();
        await LabelsetApi.put(this.labelSet);
    }

    /**
     * Deletes the current labelset from the server.
     */
    public async deleteLabels(): Promise<void> {
        if (this.labelSet?.uuid == null) return Promise.reject("No labels to store");
        await LabelsetApi.delete(this.labelSet.uuid);
        this.labelSet.uuid = null;
        this.userInterface.reload(null, false);

        HashAddress.unset();
    }

    /**
     * Open the quiz editor, referencing this labelset.
     */
    public createQuiz(): void {
        if (this.labelSet.uuid == null) throw "No stored labels to make quiz of!";
        new HashAddress(this.labelSet.uuid, HashAddressType.QuizCreate).set();
        location.reload();
    }
}

