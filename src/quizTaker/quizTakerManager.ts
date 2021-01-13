import QuizMasterManager from "../quizmaster/quizMasterManager";
import { LabelManager } from "../labels/labelManager";
import { QuestionType, QuestionName, QuestionLocate, Question, QuestionFreeform } from "../quizmaster/Question";
import { QuizTakerUi } from "./QuizTakerUi";
import { Answer } from "./answer";
import { Label } from "../labels/Label";

/**
 * Manages the quiz taking process.
 * It is sort of built like a state machine:
 * - `start` being called begins the process, and calls the first `nextQuestion`,
 * - `nextQuestion` presents a question,
 * - `submitAnswer` presents the answer,
 * - `finish` presents the results.
 */
export default class QuizTakerManager {
    private quizMasterManager: QuizMasterManager;
    private labelManager: LabelManager;
    private ui: QuizTakerUi;
    private answers: Answer[] = [];
    private questionIndex = -1;
    private questions: Question[] = [];

    public constructor(quizMasterManager: QuizMasterManager, labelManager: LabelManager) {
        this.quizMasterManager = quizMasterManager;
        this.labelManager = labelManager;

        const quizUi = document.getElementById("quizzer") as HTMLDivElement;
        quizUi.classList.remove("hide");

        labelManager.setOnActiveLabelChangeHandler(this.selectedLabelChanged.bind(this));

        this.ui = new QuizTakerUi();
        this.ui.bind(this.ui.begin, this.start.bind(this));
    }

    /**
     * Begins the quiz process.
     */
    private start(): void {
        const ui = this.ui;
        ui.hide(ui.start);
        ui.show(ui.question);
        ui.unbind(ui.begin);
        ui.bind(ui.submit, this.submitAnswer.bind(this));
        ui.bind(ui.next, this.nextQuestion.bind(this));

        this.questions = this.quizMasterManager.getQuestions();
        if (this.quizMasterManager.Shuffle()) {
            this.shuffle();
        }

        this.nextQuestion();
    }

    /**
     * Picks the next question, manipulates the viewpoint if required, etc.
     */
    private nextQuestion(): void {
        const ui = this.ui;
        ui.hideMany(ui.next, ui.correct, ui.wrong, ui.answerText, ui.answerLabel);
        ui.enable(ui.answerText);
        ui.clearInput(ui.answerText);
        ui.show(ui.submit);

        (document.getElementById("tool-picker") as HTMLInputElement).classList.remove("hide");
        (document.getElementById("tool-picker-label") as HTMLInputElement).classList.remove("hide");

        this.questionIndex++;
        if (this.questionIndex >= this.questions.length) {
            this.finish();
            return;
        }

        const question = this.questions[this.questionIndex];
        ui.setText(ui.questionText, question.textPrompt);

        switch (question.questionType) {
            case QuestionType.Freeform:
            case QuestionType.Name: {
                ui.show(ui.answerText);

                // Move camera and marker to the label in question.
                const q = question as (QuestionName | QuestionFreeform);
                const label = this.labelManager.getLabel(q.labelId);
                if (label == null) throw `Could not find label with id ${q.labelId}`;
                this.labelManager.moveCameraToLabel(label);
                this.labelManager.moveLightToLabel(label);

                this.labelManager.setVisibility(false);
                this.labelManager.renderer.setColorForVertices(label.vertices, label.color);

                // Disable the picker to avoid moving the marker
                (document.getElementById("tool-camera") as HTMLInputElement).click();
                (document.getElementById("tool-picker") as HTMLInputElement).classList.add("hide");
                (document.getElementById("tool-picker-label") as HTMLInputElement).classList.add("hide");

                break;
            }
            case QuestionType.Locate: {
                const q = question as QuestionLocate;
                this.labelManager.setVisibility(q.showRegions);
                break;
            }
        }
    }

    /**
     * Checks if the answer was correct.
     */
    private submitAnswer(): void {
        const ui = this.ui;

        const question = this.questions[this.questionIndex];
        let correct;
        switch (question.questionType) {
            case QuestionType.Freeform:
            case QuestionType.Name: {
                const q = question as (QuestionName | QuestionFreeform);
                const input = ui.getInput(ui.answerText);
                const answer = q.textAnswer;
                correct = input.toLowerCase() == answer.toLowerCase();
                this.answers.push(new Answer(this.questionIndex, input, answer, correct));
                break;
            }
            case QuestionType.Locate: {
                const q = question as (QuestionLocate);
                const answer = this.labelManager.getLabel(q.labelId);
                const input = this.labelManager.lastClicked();
                if (answer == null) {
                    const err = `Label ${q.labelId} not found.`;
                    alert(err);
                    throw err;
                }
                correct = input != null && answer.id == input.id;
                this.answers.push(new Answer(this.questionIndex, input?.name ?? "N/A", answer.name, correct));
                break;
            }
        }

        ui.show(correct ? ui.correct : ui.wrong);
        ui.disable(ui.answerText);
        ui.hide(ui.submit);
        ui.show(ui.next);
    }

    /**
     * Concludes the quiz and displays the results.
     */
    private finish(): void {
        const ui = this.ui;
        ui.unbind(ui.submit);
        ui.unbind(ui.next);
        ui.hide(ui.question);
        ui.show(ui.result);

        ui.renderAnswerTable(this.answers);
    }

    /**
     * Event handler called when the active label changes.
     * @param label The new selected label.
     */
    private selectedLabelChanged(label: Label): void {
        const ui = this.ui;
        const text = "Selected: " + label.name;
        ui.setText(ui.answerLabel, text);
    }

    /**
     * Shuffles the question order.
     */
    private shuffle(): void {
        for (let i = this.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
        }
    }
}
