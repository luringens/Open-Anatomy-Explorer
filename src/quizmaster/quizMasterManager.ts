/* eslint-disable */

import { Question, QuestionName, QuestionLocate, QuestionType } from "./Question";
import { LabelManager } from "../labels/labelManager";


export default class QuizMasterManager {
    private questions: Question[] = [];
    private labelGuid: string;
    private quizGuid: string | null = null;
    private labelManager: LabelManager;

    public constructor(labelGuid: string, quizGuid: string | null, labelManager: LabelManager) {
        this.labelGuid = labelGuid;
        this.quizGuid = quizGuid;
        this.labelManager = labelManager;

        if (quizGuid != null) {
            this.loadQuestions(quizGuid);
        }
    }

    public addQuestion(question: Question) {
        // if (question.questionType == QuestionType.Name) {
        //     const q = question as QuestionName;
        //     throw "Unimplemented";
        // } else if (question.questionType == QuestionType.Locate) {
        //     const q = question as QuestionLocate;
        //     throw "Unimplemented";
        // } else {
        //     throw "Unknown question type";
        // }
        this.questions.push(question);
        this.createRow(question);
    }

    public createRow(question: Question): HTMLDivElement {
        const label = this.labelManager.labels[question.id];
        const element = document.createElement("div");
        element.className = "question-editor";
        element.id = "question-" + String(question.id);

        const header = document.createElement("h3");
        header.innerText = "Question #" + String(question.id) + ": " + question.questionType.toString();
        element.append(header);

        const textArea = document.createElement("textarea");
        textArea.innerText = question.textPrompt;
        textArea.id = element.id + "-textPrompt"
        element.append(textArea);

        const regionPicker = document.createElement("button");
        regionPicker.innerText = "Selected: " + label.name;
        // TODO: onclick
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
        // TODO: onclick
        element.append(deleteLink);

        return element;
    }

    public deleteRow(questionId: number): void {
        // Delete row
        // Delete question
        throw "Unimplemented";
    }

    public loadQuestions(quizGuid: string) {
        // const quiz = QuizStorage.load(quizGuid);
        // foreach (let q of quiz) this.addQuestion(q);
        throw "Unimplemented";
    }

    public saveQuestions(): void {
        // QuizStorage.save(this.questions);
        throw "Unimplemented";
    }

    public updateQuestions(): void {
        // QuizStorage.update(this.questions, this.quizGuid);
        throw "Unimplemented";
    }
}
