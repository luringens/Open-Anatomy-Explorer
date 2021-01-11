/* eslint-disable */

import { Question, QuestionName, QuestionLocate, QuestionType, GetQuestionTypeName, QuestionFreeform, Quiz } from "./Question";
import { LabelManager } from "../labels/labelManager";
import { Label } from "../labels/Label";
import Api from "../api";
import { HashAddressType, HashAdress } from "../utils";

export default class QuizMasterManager {
    private quiz: Quiz;
    private questions: Question[];
    private labelManager: LabelManager;
    private nextQuestionId = 0;

    /// Constructs a new QuizMasterManager.
    /// If the LabelManager does not have labels loaded, loadQuiz should be called immediately after
    /// construction, which will instruct the LabelManager of which labels to load.
    public constructor(
        labelManager: LabelManager,
        showEditor: boolean
    ) {
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

        // Setting labelset ID to zero is *not actually valid*.  However, this should only happen
        // when this.loadQuiz is getting called next to load the LabelManager with a labelId from
        // a quiz. Unfortunate invariant to keep in mind.
        this.quiz = new Quiz("", null, labelManager.labelSet.id ?? 0, false, []);
        this.questions = this.quiz.questions;
    }

    public Shuffle(): boolean {
        return this.quiz.shuffle;
    }

    public getQuestions(): Question[] {
        return this.questions;
    }

    public getQuizUuid(): null | string {
        return this.quiz.uuid;
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

    public async loadQuestions(quizGuid: string): Promise<void> {
        const quiz = await Api.Quiz.load(quizGuid);
        this.quiz = quiz;
        this.questions = this.quiz.questions;
        this.nextQuestionId = 0;

        // Before populating the UI, we need the name of the labels.
        await this.labelManager.loadWithModelById(this.quiz.labelSet);

        (document.getElementById("quiz-name") as HTMLInputElement).value = quiz.name;
        (document.getElementById("quiz-shuffle") as HTMLInputElement).checked = this.quiz.shuffle;

        const oldQuestions = document.getElementsByClassName("question-editor");
        while (oldQuestions.length > 0) {
            oldQuestions[oldQuestions.length - 1].remove();
        }

        quiz.questions.forEach(q => {
            this.nextQuestionId = Math.max(this.nextQuestionId, q.id + 1);
            const label = this.labelManager.getLabel(q.labelId);
            if (label != null) {
                this.createRow(q, label);
            } else {
                console.error("Label " + q.labelId + " not found!");
            }
        });

        this.setDisplayStoredQuizControls(true);
    }

    private setDisplayStoredQuizControls(visible: boolean): void {
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

    public async saveQuestions(): Promise<void> {
        this.updateDataFromUi();
        this.quiz.uuid = await Api.Quiz.post(this.quiz);
        this.setDisplayStoredQuizControls(true);
        new HashAdress(this.quiz.uuid, HashAddressType.QuizEdit).set();
    }

    public async updateQuestions(): Promise<void> {
        this.updateDataFromUi();
        if (this.quiz.uuid == null) return Promise.reject("No stored quiz!");
        await Api.Quiz.put(this.quiz);
    }

    public async deleteQuestions(): Promise<void> {
        if (this.quiz.uuid == null) return Promise.reject("No stored quiz!");
        await Api.Quiz.delete(this.quiz.uuid);
        this.quiz.uuid = null;
        this.setDisplayStoredQuizControls(false);

        const labelUuid = this.labelManager.getSavedLabelUuid();
        if (labelUuid == null) console.warn("Can not set hash address due to missing label UUID!");
        else new HashAdress(labelUuid, HashAddressType.QuizCreate).set();
    }

    private updateDataFromUi(): void {
        const nameElement = document.getElementById("quiz-name") as HTMLInputElement;
        this.quiz.name = nameElement.value;
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

    private takeQuiz(): void {
        if (this.quiz.uuid == null) throw "No stored quiz to take!";
        new HashAdress(this.quiz.uuid, HashAddressType.QuizTake).set();
        location.reload();
    }

    private onShuffleChange(event: Event): void {
        this.quiz.shuffle = (event.target as HTMLInputElement).checked;
    }
}
