/* eslint-disable */

import { Question, QuestionName, QuestionLocate, QuestionType, GetQuestionTypeName, QuestionFreeform } from "./Question";
import { LabelManager } from "../labels/labelManager";
import { Quiz, QuizStorage } from "./quizStorage";
import { Label } from "../labels/Label";


export default class QuizMasterManager {
    private questions: Question[] = [];
    private quizGuid: string | null = null;
    private labelManager: LabelManager;
    private nextQuestionId = 0;
    private shuffle: boolean = false;

    /// Constructs a new QuizMasterManager
    /// If quizGuid is not null, it will attempt to load the selected quiz and
    /// call the provided callback function with the quiz information.
    /// This callback must initialize the label manager to fully load the quiz.
    public constructor(
        labelManager: LabelManager,
        quizGuid: string | null,
        showEditor: boolean,
        callback: ((_: Quiz) => Promise<void>) | null = null
    ) {
        this.quizGuid = quizGuid;
        this.labelManager = labelManager;

        (document.getElementById("quiz-add-locate") as HTMLButtonElement)
            .onclick = this.addQuestion.bind(this, QuestionType.Locate);
        (document.getElementById("quiz-add-name") as HTMLButtonElement)
            .onclick = this.addQuestion.bind(this, QuestionType.Name);
        (document.getElementById("quiz-add-freeform") as HTMLButtonElement)
            .onclick = this.addQuestion.bind(this, QuestionType.Freeform);
        (document.getElementById("quiz-save") as HTMLButtonElement)
            .onclick = this.saveQuestions.bind(this);
        (document.getElementById("quiz-update") as HTMLButtonElement)
            .onclick = this.updateQuestions.bind(this);
        (document.getElementById("quiz-delete") as HTMLButtonElement)
            .onclick = this.deleteQuestions.bind(this);
        (document.getElementById("quiz-take") as HTMLButtonElement)
            .onclick = this.takeQuiz.bind(this);
        (document.getElementById("quiz-shuffle") as HTMLInputElement)
            .onchange = this.onShuffleChange.bind(this);

        // Show editor
        if (showEditor) {
            document.getElementById("quiz-editor")?.classList.remove("hide");
        }

        if (quizGuid != null) {
            document.getElementById("quiz-update")?.classList.remove("hide");
            document.getElementById("quiz-delete")?.classList.remove("hide");
            document.getElementById("quiz-take")?.classList.remove("hide");

            if (callback != null) {
                this.loadQuestions(quizGuid, callback);
            }
        }

    }

    public Shuffle(): boolean {
        return this.shuffle;
    }

    public getQuestions(): Question[] {
        return this.questions;
    }

    public addQuestion(questionType: QuestionType) {
        let label = this.labelManager.mostRecentlyClickedLabel();
        if (label == null) label = this.labelManager.labels[0];
        let question: Question;
        switch (questionType) {
            case QuestionType.Name:
                question = new QuestionName(this.nextQuestionId++, label.id);
                break;
            case QuestionType.Locate:
                question = new QuestionLocate(this.nextQuestionId++, label.id);
                break;
            case QuestionType.Freeform:
                question = new QuestionFreeform(this.nextQuestionId++, label.id);
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

    private moveQuestion(questionId: number, up: boolean): void {
        const first = document.getElementById(`question-${questionId}`);
        const second = up ? first?.previousSibling : first?.nextSibling;
        if (first == null || second == null || second == undefined || second.nodeName != "DIV")
            return;

        if (up) first.parentNode?.insertBefore(first, second);
        else first.parentNode?.insertBefore(second, first);

        const q1 = questionId;
        const q2 = Number.parseInt((second as HTMLDivElement).id.split("-")[1]);

        const i1 = this.questions.findIndex(e => e.id == q1);
        const i2 = this.questions.findIndex(e => e.id == q2);

        // Swap array positions.
        const temp = this.questions[i1];
        this.questions[i1] = this.questions[i2];
        this.questions[i2] = temp;
    }

    public setRegion(questionId: number, labelPrefix: string): void {
        const label = this.labelManager.mostRecentlyClickedLabel();
        if (label == null) return;
        const index = this.getIndexForQuestion(questionId);
        this.questions[index].labelId = label.id;
        const buttonId = "question-" + questionId + "-regionpicker";
        const button = (document.getElementById(buttonId) as HTMLButtonElement);

        button.innerText = labelPrefix + label.name;
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

    public async loadQuestions(quizGuid: string, callback: ((_: Quiz) => Promise<void>)) {
        const quiz = await QuizStorage.loadQuizAsync(quizGuid);
        this.questions = quiz.questions;
        // Before populating the UI, we need the name of the labels
        // Before getting the labels, we need the model...

        await callback(quiz);

        this.shuffle = quiz.shuffle;
        (document.getElementById("quiz-shuffle") as HTMLInputElement).checked = this.shuffle;

        quiz.questions.forEach(q => {
            this.nextQuestionId = Math.max(this.nextQuestionId, q.id + 1);
            const label = this.labelManager.getLabel(q.labelId);
            if (label != null) {
                this.createRow(q, label);
            } else {
                console.error("Label " + q.labelId + " not found!");
            }
        });
    }

    public async saveQuestions(): Promise<void> {
        this.updateDataFromUi();
        await QuizStorage.storeQuiz(this.serialize());
    }

    public async updateQuestions(): Promise<void> {
        this.updateDataFromUi();
        if (this.quizGuid == null) throw "No stored quiz!";
        await QuizStorage.updateQuiz(this.quizGuid, this.serialize());
    }

    public deleteQuestions(): void {
        if (this.quizGuid == null) throw "No stored quiz!";
        QuizStorage.deleteQuiz(this.quizGuid, this.labelManager.getSavedLabelUuid());
    }

    private updateDataFromUi(): void {
        for (const question of this.questions) {
            const id = "question-" + question.id;
            const textPrompt = document.getElementById(id + "-textPrompt");
            question.textPrompt = (textPrompt as HTMLTextAreaElement).value;

            switch (question.questionType) {
                case QuestionType.Locate: {
                    const q = question as QuestionLocate;
                    const showRegions = document.getElementById(id + "-showRegions");
                    q.showRegions = (showRegions as HTMLInputElement).checked;
                    break;
                }
                case QuestionType.Name | QuestionType.Freeform: {
                    const q = question as (QuestionName | QuestionFreeform);
                    const textAnswer = document.getElementById(id + "-textAnswer");
                    q.textAnswer = (textAnswer as HTMLInputElement).value;
                    break;
                }
            }
        }
    }

    private serialize(): Quiz {
        const labelUuid = this.labelManager.getSavedLabelUuid();
        if (labelUuid == null) throw "No labels loaded?";
        return new Quiz(
            this.questions,
            this.labelManager.getModelName(),
            labelUuid,
            this.shuffle
        );
    }

    private takeQuiz(): void {
        window.location.href = window.origin + location.pathname
            + "?quiz=" + this.quizGuid;
    }

    private onShuffleChange(event: Event): void {
        this.shuffle = (event.target as HTMLInputElement).checked;
    }
}
