import QuizMasterManager from "../quizmaster/quizMasterManager";
import { LabelManager } from "../labels/labelManager";
import { QuestionType, QuestionName, QuestionLocate } from "../quizmaster/Question";
import { QuizTakerUi } from "./QuizTakerUi";
import { Answer } from "./Answer";

export default class QuizTakerManager {
    private quizMasterManager: QuizMasterManager;
    private labelManager: LabelManager;
    private ui: QuizTakerUi;
    private answers: Answer[] = [];
    private questionIndex = -1;

    public constructor(quizMasterManager: QuizMasterManager, labelManager: LabelManager) {
        this.quizMasterManager = quizMasterManager;
        this.labelManager = labelManager;

        const quizUi = document.getElementById("quizzer") as HTMLDivElement;
        quizUi.classList.remove("hide");

        this.ui = new QuizTakerUi();
        this.ui.bind(this.ui.begin, this.start.bind(this));
    }

    private start(): void {
        const ui = this.ui;
        ui.hide(ui.start);
        ui.show(ui.question);
        ui.unbind(ui.begin);
        ui.bind(ui.submit, this.submitAnswer.bind(this));
        ui.bind(ui.next, this.nextQuestion.bind(this));
        this.nextQuestion();
    }

    private nextQuestion(): void {
        const ui = this.ui;
        ui.show(ui.submit);
        ui.hide(ui.next);
        ui.hide(ui.correct);
        ui.hide(ui.wrong);

        this.questionIndex++;
        if (this.questionIndex >= this.quizMasterManager.questionCount()) {
            this.finish();
            return;
        }

        const question = this.quizMasterManager.getQuestion(this.questionIndex);
        ui.setText(ui.questionText, question.textPrompt);
    }

    private submitAnswer(): void {
        const ui = this.ui;

        const question = this.quizMasterManager.getQuestion(this.questionIndex);
        let correct;
        switch (question.questionType) {
            case QuestionType.Name: {
                const q = question as QuestionName;
                const input = ui.getText(ui.answerText);
                const answer = q.textAnswer;
                correct = input.toLowerCase() == answer.toLowerCase();
                this.answers.push(new Answer(this.questionIndex, input, answer, correct));
                break;
            }
            case QuestionType.Locate: {
                const q = question as QuestionLocate;
                const answer = this.labelManager.getLabel(q.labelId);
                const input = this.labelManager.lastClickedLabel();
                if (input == undefined) return;
                if (answer == null) {
                    const err = "Label " + q.labelId + " not found.";
                    alert(err);
                    throw err;
                }
                correct = answer.id == input.id;
                this.answers.push(new Answer(this.questionIndex, input.name, answer.name, correct));
                break;
            }
        }

        ui.show(correct ? ui.correct : ui.wrong);
        ui.hide(ui.submit);
        ui.show(ui.next);
    }

    private finish(): void {
        const ui = this.ui;
        ui.unbind(ui.submit);
        ui.unbind(ui.next);
        ui.hide(ui.question);
        ui.show(ui.result);

        ui.renderAnswerTable(this.answers);
    }
}
