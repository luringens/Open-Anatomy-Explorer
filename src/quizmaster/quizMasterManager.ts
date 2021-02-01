import { Question, QuestionName, QuestionLocate, QuestionType, QuestionFreeform, Quiz } from "./quiz";
import { LabelManager } from "../labels/labelManager";
import { Label } from "../labels/Label";
import QuizApi from "../Api/quiz";
import { HashAddress, HashAddressType } from "../HashAddress";
import QuizMasterUi from "./quizMasterUi";

export default class QuizMasterManager {
    private quiz: Quiz;
    private questions: Question[];
    private labelManager: LabelManager;
    private nextQuestionId = 0;
    private quizMasterUi: QuizMasterUi | null = null;

    /**
     * Constructs a new QuizMasterManager.
     * If the LabelManager does not have labels loaded, loadQuiz should be called immediately after
     * construction, which will instruct the LabelManager of which labels to load.
     * @param showEditor Whether or not to show the quiz editor UI.
     */
    public constructor(
        labelManager: LabelManager,
        showEditor: boolean
    ) {
        this.labelManager = labelManager;

        // Setting labelset ID to zero is *not actually valid*. However, this should only happen
        // when this.loadQuiz is getting called next to load the LabelManager with a labelId from
        // a quiz. Unfortunate invariant to keep in mind.
        this.quiz = new Quiz("", null, labelManager.labelSet.id ?? 0, false, []);
        this.questions = this.quiz.questions;

        if (showEditor) {
            this.quizMasterUi = new QuizMasterUi(this, labelManager);
        }
    }


    /**
     * Load a quiz with the specified UUID.
     * This will also initalize the LabelManager with the quiz's associated label set.
     */
    public async loadQuiz(quizUuid: string): Promise<void> {
        const quiz = await QuizApi.load(quizUuid);
        this.quiz = quiz;
        this.questions = this.quiz.questions;
        this.nextQuestionId = 0;

        // Before populating the UI, we need the name of the labels.
        await this.labelManager.loadWithModelById(this.quiz.labelSet);

        // Populate UI if it's initalized.
        this.quizMasterUi?.loadQuiz(quiz);
    }

    /**
     * Gets a list of all current quiz questions.
     */
    public getQuestions(): Question[] {
        return this.questions;
    }

    /**
     * Gets the UUID of the current quiz if present.
     */
    public getQuizUuid(): null | string {
        return this.quiz.uuid;
    }

    /**
     * Gets the Quiz data the class is managing.
     */
    public getQuiz(): Quiz {
        return this.quiz;
    }

    /**
     * Adds a blank question of the specified type to the quiz.
     * @returns The question that was added and it's associated label.
     */
    public addQuestion(questionType: QuestionType): [Question, Label] {
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
        return [question, label];
    }

    /**
     * Gets the index of a question in the questions array.
     */
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

    /**
     * Saves the quiz to the server.
     */
    public async saveQuiz(): Promise<void> {
        this.quizMasterUi?.updateDataFromUi(this.quiz);
        this.quiz.uuid = await QuizApi.post(this.quiz);
        this.quizMasterUi?.setDisplayStoredQuizControls(true);
        new HashAddress(this.quiz.uuid, HashAddressType.QuizEdit).set();
    }

    /**
     * Saves the quiz to the server using the already present UUID, overwriting a previously
     * stored version if present.
     */
    public async updateQuiz(): Promise<void> {
        this.quizMasterUi?.updateDataFromUi(this.quiz);
        if (this.quiz.uuid == null) return Promise.reject("No stored quiz!");
        await QuizApi.put(this.quiz);
    }

    /**
     * Deletes the quiz from the remote server.
     */
    public async deleteQuiz(): Promise<void> {
        if (this.quiz.uuid == null) return Promise.reject("No stored quiz!");
        await QuizApi.delete(this.quiz.uuid);
        this.quiz.uuid = null;
        this.quizMasterUi?.setDisplayStoredQuizControls(false);

        const labelUuid = this.labelManager.getSavedLabelUuid();
        if (labelUuid == null) console.warn("Can not set hash address due to missing label UUID!");
        else new HashAddress(labelUuid, HashAddressType.QuizCreate).set();
    }

    /**
     * If the quiz has been saved (has a valid UUID), reloads the page in quiz taking mode.
     */
    public takeQuiz(): void {
        if (this.quiz.uuid == null) throw "No stored quiz to take!";
        new HashAddress(this.quiz.uuid, HashAddressType.QuizTake).set();
        location.reload();
    }

    /**
     * Returns whether or not the order of the questions will be shuffled.
     */
    public shuffle(): boolean {
        return this.quiz.shuffle;
    }

    /**
     * Sets whether or not the order of the questions will be shuffled.
     */
    public setShuffle(shuffle: boolean): void {
        this.quiz.shuffle = shuffle;
    }
}
