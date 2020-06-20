/* eslint-disable */

import { Question, QuestionName, QuestionLocate, QuestionType } from "./Question";


export default class QuizMasterManager {
    private questions: Question[] = [];
    private labelGuid: string;
    private quizGuid: string | null = null;

    public constructor(labelGuid: string, quizGuid: string | null) {
        this.labelGuid = labelGuid;
        this.quizGuid = quizGuid;

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

    public createRow(question: Question): void {
        throw "Unimplemented";
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
