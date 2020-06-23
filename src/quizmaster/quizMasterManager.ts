/* eslint-disable */

import { Question, QuestionName, QuestionLocate, QuestionType, GetQuestionTypeName } from "./Question";
import { LabelManager } from "../labels/labelManager";
import { Quiz, QuizStorage } from "./quizStorage";
import { Label } from "../labels/Label";


export default class QuizMasterManager {
    private questions: Question[] = [];
    private quizGuid: string | null = null;
    private labelManager: LabelManager;
    private nextQuestionId = 0;

    public constructor(quizGuid: string | null, labelManager: LabelManager) {
        this.quizGuid = quizGuid;
        this.labelManager = labelManager;

        (document.getElementById("quiz-add-locate") as HTMLButtonElement)
            .onclick = this.addQuestion.bind(this, QuestionType.Locate);
        (document.getElementById("quiz-add-name") as HTMLButtonElement)
            .onclick = this.addQuestion.bind(this, QuestionType.Name);
        (document.getElementById("quiz-save") as HTMLButtonElement)
            .onclick = this.saveQuestions.bind(this);
        (document.getElementById("quiz-update") as HTMLButtonElement)
            .onclick = this.updateQuestions.bind(this);
        (document.getElementById("quiz-delete") as HTMLButtonElement)
            .onclick = this.deleteQuestions.bind(this);

        // Show editor
        if (labelManager.getSavedLabelUuid() != null) {
            document.getElementById("quiz-editor")?.classList.remove("hide");
        }

        if (quizGuid != null) {
            this.loadQuestions(quizGuid);
        }
    }

    public addQuestion(questionType: QuestionType) {
        let label = this.labelManager.lastClickedLabel();
        if (label == null) label = this.labelManager.labels[0];
        let question: Question;
        switch (questionType) {
            case QuestionType.Name:
                question = new QuestionName(this.nextQuestionId++, label.id);
                break;
            case QuestionType.Locate:
                question = new QuestionLocate(this.nextQuestionId++, label.id);
                break;
        }

        this.questions.push(question);
        this.createRow(question, label);
    }

    public createRow(question: Question, label: Label): HTMLDivElement {
        const element = document.createElement("div");
        element.className = "question-editor";
        element.id = "question-" + String(question.id);

        const header = document.createElement("h3");
        header.innerText = "Question #" + String(question.id)
            + ": " + GetQuestionTypeName(question.questionType);
        element.append(header);

        const textArea = document.createElement("textarea");
        textArea.innerText = question.textPrompt;
        textArea.id = element.id + "-textPrompt"
        element.append(textArea);

        const regionPicker = document.createElement("button");
        regionPicker.id = element.id + "-regionpicker"
        regionPicker.innerText = "Selected: " + label.name;
        regionPicker.onclick = this.setRegion.bind(this, question.id);
        element.append(regionPicker);

        if (question.questionType == QuestionType.Locate) {
            const q = question as QuestionLocate;
            const showRegionsCheck = document.createElement("input");
            showRegionsCheck.type = "checkbox";
            showRegionsCheck.checked = q.showRegions;
            showRegionsCheck.id = element.id + "-showRegions";
            element.append(showRegionsCheck);

            const showRegionsLabel = document.createElement("label");
            showRegionsLabel.innerText = "Display regions";
            element.append(showRegionsLabel);
        }

        const deleteLink = document.createElement("a");
        deleteLink.innerText = "❌";
        deleteLink.onclick = this.deleteRow.bind(this, question.id);
        element.append(deleteLink);

        document.getElementById("questions")?.append(element);

        return element;
    }

    public setRegion(questionId: number): void {
        const label = this.labelManager.lastClickedLabel();
        if (label == null) return;
        const index = this.getIndexForQuestion(questionId);
        this.questions[index].labelId = label.id;
        const buttonId = "question-" + questionId + "-regionpicker";
        (document.getElementById(buttonId) as HTMLButtonElement).innerText = label.name;
    }

    public deleteRow(questionId: number): void {
        document.getElementById("question-" + String(questionId))?.remove();
        const index = this.getIndexForQuestion(questionId);

        this.questions.splice(index, 1);
    }

    public getIndexForQuestion(questionId: number): number {
        let index = -1;
        for (let i = 0; i < this.questions.length; i++) {
            if (this.questions[i].id === questionId) {
                index = i;
                break;
            }
        }
        if (index === -1) throw "Could not find position in label list.";
        return index;
    }

    public loadQuestions(quizGuid: string) {
        // const quiz = QuizStorage.load(quizGuid);
        throw "Unimplemented";
    }

    public saveQuestions(): void {
        QuizStorage.storeQuiz(this.serialize());
    }

    public updateQuestions(): void {
        if (this.quizGuid == null) throw "No stored quiz!";
        QuizStorage.updateQuiz(this.quizGuid, this.serialize());
    }

    public deleteQuestions(): void {
        if (this.quizGuid == null) throw "No stored quiz!";
        QuizStorage.deleteQuiz(this.quizGuid);
    }

    private serialize(): Quiz {
        const labelUuid = this.labelManager.getSavedLabelUuid();
        if (labelUuid == null) throw "No labels loaded?";
        return new Quiz(
            this.questions,
            this.labelManager.getModelName(),
            labelUuid
        );
    }
}
