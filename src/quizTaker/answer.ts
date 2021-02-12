/**
 * Data class holding a list of user-given answers to questions, as well as the true correct answer.
 */
export class Answer {
    public readonly questionNumber: number;
    public readonly input: string;
    public readonly answer: string;
    public readonly correct: boolean;

    public constructor(questionNumber: number, input: string, answer: string, correct: boolean) {
        this.questionNumber = questionNumber;
        this.input = input;
        this.answer = answer;
        this.correct = correct;
    }
}
