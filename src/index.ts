import { Renderer } from "./renderer";
import { LabelManager } from "./labels/labelManager";
import { ModelManager } from "./modelManager";
import QuizMasterManager from "./quizmaster/quizMasterManager";
import QuizTakerManager from "./quizTaker/quizTakerManager";
import Api from "./api";
import { HashAddressType, HashAdress } from "./utils";

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
modelManager.setOnload(() => void labelManager?.reset(null));

// Check if we are to load labels, models, quizzes...
const action = HashAdress.fromAddress();

// If nothing else is specified in the address, just load the label editor from scratch.
if (action == null) {
    void Api.modelStorage.lookup(defaultModel)
        .then(ModelManager.loadAsync.bind(ModelManager))
        .then(renderer.loadObject.bind(renderer))
        .then(() => {
            labelManager = new LabelManager(renderer, true, defaultModel);
            labelManager.reset();
        });
}

else switch (action.action) {
    // Load label editor with stored labels.
    case HashAddressType.Label:
        labelManager = new LabelManager(renderer, true, 0);
        void labelManager.loadWithModelByUuid(action.uuid);
        break;

    // Load quiz editor, instructed to create a new quiz from stored labels.
    case HashAddressType.QuizCreate:
        labelManager = new LabelManager(renderer, false, 0);
        void labelManager.loadWithModelByUuid(action.uuid).then(() => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            quizMasterManager = new QuizMasterManager(labelManager!, true);
        });
        break;

    // Load quiz editor on existing stored quiz.
    case HashAddressType.QuizEdit:
        labelManager = new LabelManager(renderer, false, 0);
        quizMasterManager = new QuizMasterManager(labelManager, true);
        void quizMasterManager.loadQuestions(action.uuid);
        break;

    // Load quiz taker from stored quiz.
    case HashAddressType.QuizTake:
        labelManager = new LabelManager(renderer, false, 0);
        quizMasterManager = new QuizMasterManager(labelManager, false);
        void quizMasterManager.loadQuestions(action.uuid).then(() =>
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            void new QuizTakerManager(quizMasterManager!, labelManager!)
        );
        break;
}
