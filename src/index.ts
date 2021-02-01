import { Renderer } from "./renderer";
import { LabelManager } from "./labels/labelManager";
import { ModelManager } from "./modelManager";
import QuizMasterManager from "./quizmaster/quizMasterManager";
import QuizTakerManager from "./quizTaker/quizTakerManager";
import { HashAddress, HashAddressType } from "./HashAddress";
import UserManager from "./user/userManager";

const defaultModel = 1;

// Reset default tool to work around browser persistence.
(document.getElementById("tool-camera") as HTMLInputElement).checked = true;

// Set up renderer.
const wrapper = document.getElementById("canvas-container") as HTMLElement;
const renderer = new Renderer(wrapper);
renderer.startRendering();

let quizMasterManager: QuizMasterManager | null = null;
let labelManager: LabelManager | null = null;

// Initialize model manager UI
const modelManager = new ModelManager(renderer);
modelManager.setOnload((id: number) => void labelManager?.newModel(id));
void modelManager.loadModelList();

// Check if we are to load labels, models, quizzes...
const action = HashAddress.fromAddress();

// If nothing else is specified in the address, just load the label editor from scratch.
if (action == null) {
    void ModelManager.loadAsync(defaultModel)
        .then(renderer.loadObject.bind(renderer))
        .then(() => {
            labelManager = new LabelManager(renderer, true, defaultModel, modelManager);
            labelManager.reset();
        })
        .then(() => new UserManager(modelManager, labelManager as LabelManager));
}

else switch (action.action) {
    // Load label editor with stored labels.
    case HashAddressType.Label:
        labelManager = new LabelManager(renderer, true, 0, modelManager);
        void labelManager.loadWithModelByUuid(action.uuid)
            .then(() => new UserManager(modelManager, labelManager as LabelManager));
        break;

    // Load quiz editor, instructed to create a new quiz from stored labels.
    case HashAddressType.QuizCreate:
        labelManager = new LabelManager(renderer, false, 0, modelManager);
        void labelManager.loadWithModelByUuid(action.uuid).then(() => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            quizMasterManager = new QuizMasterManager(labelManager!, true);
            new UserManager(modelManager, labelManager as LabelManager, quizMasterManager);
        });
        break;

    // Load quiz editor on existing stored quiz.
    case HashAddressType.QuizEdit:
        labelManager = new LabelManager(renderer, false, 0, modelManager);
        quizMasterManager = new QuizMasterManager(labelManager, true);
        void quizMasterManager.loadQuiz(action.uuid)
            .then(() => new UserManager(modelManager, labelManager as LabelManager, quizMasterManager));
        break;

    // Load quiz taker from stored quiz.
    case HashAddressType.QuizTake:
        labelManager = new LabelManager(renderer, false, 0, modelManager);
        quizMasterManager = new QuizMasterManager(labelManager, false);
        void quizMasterManager.loadQuiz(action.uuid).then(() => {
            new QuizTakerManager(quizMasterManager as QuizMasterManager, labelManager as LabelManager);
            new UserManager(modelManager, labelManager as LabelManager, quizMasterManager);
        });
        break;
}
