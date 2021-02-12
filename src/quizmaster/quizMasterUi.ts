import { Question, QuestionName, QuestionLocate, QuestionType, GetQuestionTypeName, QuestionFreeform, Quiz } from "./quiz";
import LabelManager from "../labels/labelManager";
import { Label } from "../labels/label";
import QuizMasterManager from "./quizMasterManager";

export default class QuizMasterUi {
    private quizMasterManager: QuizMasterManager;
    private labelManager: LabelManager;

    /**
     * Constructs a new QuizMasterUi.
     */
    public constructor(
        quizMasterManager: QuizMasterManager,
        labelManager: LabelManager,
    ) {
        this.quizMasterManager = quizMasterManager;
        this.labelManager = labelManager;

        (document.getElementById("quiz-add-locate") as HTMLButtonElement)
            .onclick = this.addQuestion.bind(this, QuestionType.Locate);
        (document.getElementById("quiz-add-name") as HTMLButtonElement)
            .onclick = this.addQuestion.bind(this, QuestionType.Name);
        (document.getElementById("quiz-add-freeform") as HTMLButtonElement)
            .onclick = this.addQuestion.bind(this, QuestionType.Freeform);
        (document.getElementById("quiz-shuffle") as HTMLInputElement)
            .onchange = this.onShuffleChange.bind(this);

        (document.getElementById("quiz-save") as HTMLButtonElement)
            .onclick = this.quizMasterManager.saveQuiz.bind(this.quizMasterManager);
        (document.getElementById("quiz-update") as HTMLButtonElement)
            .onclick = this.quizMasterManager.updateQuiz.bind(this.quizMasterManager);
        (document.getElementById("quiz-delete") as HTMLButtonElement)
            .onclick = this.quizMasterManager.deleteQuiz.bind(this.quizMasterManager);
        (document.getElementById("quiz-take") as HTMLButtonElement)
            .onclick = this.quizMasterManager.takeQuiz.bind(this.quizMasterManager);

        document.getElementById("quiz-editor")?.classList.remove("hide");
    }


    /**
     * Load a quiz with the specified UUID.
     * This will also initalize the LabelManager with the quiz's associated label set.
     */
    public loadQuiz(quiz: Quiz): void {
        (document.getElementById("quiz-name") as HTMLInputElement).value = quiz.name;
        (document.getElementById("quiz-shuffle") as HTMLInputElement).checked = quiz.shuffle;

        const oldQuestions = document.getElementsByClassName("question-editor");
        while (oldQuestions.length > 0) {
            oldQuestions[oldQuestions.length - 1].remove();
        }

        quiz.questions.forEach(q => {
            const label = this.labelManager.getLabel(q.labelId);
            if (label != null) {
                this.createRow(q, label);
            } else {
                console.error(`Label "${q.labelId}" not found!`);
            }
        });

        this.setDisplayStoredQuizControls(true);
    }

    /**
     * Renders the user interface for a new question with an associated label.
     */
    private createRow(question: Question, label: Label): HTMLDivElement {
        const element = document.createElement("div");
        element.className = "question-editor";
        element.id = "question-" + String(question.id);

        const header = document.createElement("h3");
        header.innerText = GetQuestionTypeName(question.questionType);
        element.append(header);

        const textArea = document.createElement("textarea");
        textArea.innerText = question.textPrompt;
        textArea.id = element.id + "-textPrompt"
        element.append(textArea);

        const regionPicker = document.createElement("button");
        regionPicker.id = element.id + "-regionpicker"
        element.append(regionPicker);
        let labelPrefix;

        switch (question.questionType) {
            case QuestionType.Locate: {
                const q = question as QuestionLocate;
                const showRegionsCheck = document.createElement("input");
                showRegionsCheck.type = "checkbox";
                showRegionsCheck.checked = q.showRegions;
                showRegionsCheck.id = element.id + "-showRegions";
                element.append(showRegionsCheck);

                const showRegionsLabel = document.createElement("label");
                showRegionsLabel.innerText = "Display regions";
                element.append(showRegionsLabel);

                labelPrefix = "Label: ";
                regionPicker.innerText = labelPrefix + label.name;
                textArea.placeholder = "Describe or name the label the quiz-taker should select.";
                break;
            }
            case QuestionType.Name: {
                const q = question as QuestionName;
                const textAnswer = document.createElement("input");
                textAnswer.type = "text";
                textAnswer.value = q.textAnswer;
                textAnswer.placeholder = "Answer";
                textAnswer.id = element.id + "-textAnswer";
                element.append(textAnswer);

                labelPrefix = "Displayed label: ";
                regionPicker.innerText = labelPrefix + label.name;
                if (question.textPrompt == "")
                    textArea.innerText = "What is the name of this region?";
                textArea.placeholder = "What is the name of this region?";
                break;
            }
            case QuestionType.Freeform: {
                const q = question as QuestionFreeform;
                const textAnswer = document.createElement("input");
                textAnswer.type = "text";
                textAnswer.value = q.textAnswer;
                textAnswer.placeholder = "Answer";
                textAnswer.id = element.id + "-textAnswer";
                element.append(textAnswer);

                labelPrefix = "Displayed label: ";
                regionPicker.innerText = labelPrefix + label.name;
                textArea.placeholder = "Enter question here...";
                break;
            }
        }
        regionPicker.onclick = this.setRegion.bind(this, question.id, labelPrefix);

        const deleteLink = document.createElement("a");
        deleteLink.innerText = "❌";
        deleteLink.onclick = this.deleteRow.bind(this, question.id);
        deleteLink.style.cursor = "pointer";
        element.append(deleteLink);

        const moveUpLink = document.createElement("a");
        moveUpLink.innerText = "⬆️";
        moveUpLink.style.cursor = "pointer";
        moveUpLink.onclick = this.moveQuestion.bind(this, question.id, true);
        element.append(moveUpLink);

        const moveDownLink = document.createElement("a");
        moveDownLink.innerText = "⬇️";
        moveDownLink.style.cursor = "pointer";
        moveDownLink.onclick = this.moveQuestion.bind(this, question.id, false);
        element.append(moveDownLink);

        document.getElementById("questions")?.append(element);

        return element;
    }

    /**
     * Adds a blank question of the specified type to the quiz.
     */
    public addQuestion(questionType: QuestionType): void {
        const [question, label] = this.quizMasterManager.addQuestion(questionType);
        this.createRow(question, label);
    }

    /**
     * Moves a question up or down in the question list.
     * @param up Set to `true` to move the question up, `false` for down.
     */
    private moveQuestion(questionId: number, up: boolean): void {
        const first = document.getElementById(`question-${questionId}`);
        const second = up ? first?.previousSibling : first?.nextSibling;
        if (first == null || second == null || second == undefined || second.nodeName != "DIV")
            return;

        if (up) first.parentNode?.insertBefore(first, second);
        else first.parentNode?.insertBefore(second, first);

        const questions = this.quizMasterManager.getQuestions();

        const q1 = questionId;
        const q2 = Number.parseInt((second as HTMLDivElement).id.split("-")[1]);

        const i1 = questions.findIndex(e => e.id == q1);
        const i2 = questions.findIndex(e => e.id == q2);

        // Swap array positions.
        const temp = questions[i1];
        questions[i1] = questions[i2];
        questions[i2] = temp;
    }

    /**
     * Sets the associated label/region of a question.
     * @param up Set to `true` to move the question up, `false` for down.
     */
    private setRegion(questionId: number, labelPrefix: string): void {
        const label = this.labelManager.mostRecentlyClickedLabel();
        if (label == null) return;
        const index = this.quizMasterManager.getIndexForQuestion(questionId);
        this.quizMasterManager.getQuestions()[index].labelId = label.id;
        const buttonId = `question-${questionId}-regionpicker`;
        const button = (document.getElementById(buttonId) as HTMLButtonElement);

        button.innerText = labelPrefix + label.name;
    }

    /**
     * Deletes a question UI element and corresponding question.
     */
    private deleteRow(questionId: number): void {
        document.getElementById("question-" + String(questionId))?.remove();
        const index = this.quizMasterManager.getIndexForQuestion(questionId);

        this.quizMasterManager.getQuestions().splice(index, 1);
    }

    /**
     * Shows or hides the UI controls for updating, deleting or taking a stored quiz.
     */
    public setDisplayStoredQuizControls(visible: boolean): void {
        if (visible) {
            document.getElementById("quiz-update")?.classList.remove("hide");
            document.getElementById("quiz-delete")?.classList.remove("hide");
            document.getElementById("quiz-take")?.classList.remove("hide");
        } else {
            document.getElementById("quiz-update")?.classList.add("hide");
            document.getElementById("quiz-delete")?.classList.add("hide");
            document.getElementById("quiz-take")?.classList.add("hide");
        }
    }

    /**
     * Goes through the question UI and updates the model in the quizmanager to match it.
     */
    public updateDataFromUi(quiz: Quiz): void {
        const nameElement = document.getElementById("quiz-name") as HTMLInputElement;
        quiz.name = nameElement.value;
        for (const question of quiz.questions) {
            const id = `question-${question.id}`;
            const textPrompt = document.getElementById(id + "-textPrompt");
            question.textPrompt = (textPrompt as HTMLTextAreaElement).value;

            switch (question.questionType) {
                case QuestionType.Locate: {
                    const q = question as QuestionLocate;
                    const showRegions = document.getElementById(id + "-showRegions");
                    q.showRegions = (showRegions as HTMLInputElement).checked;
                    break;
                }
                case QuestionType.Name:
                case QuestionType.Freeform: {
                    const q = question as (QuestionName | QuestionFreeform);
                    const textAnswer = document.getElementById(id + "-textAnswer");
                    q.textAnswer = (textAnswer as HTMLInputElement).value;
                    break;
                }
            }
        }
    }

    /**
     * Event handler to be used for a checkbox toggling the quiz shuffle setting.
     */
    private onShuffleChange(event: Event): void {
        const shuffle = (event.target as HTMLInputElement).checked;
        this.quizMasterManager.setShuffle(shuffle);
    }
}
