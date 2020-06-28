import { Answer } from "./Answer";

export class QuizTakerUi {

    public readonly start: HTMLDivElement;
    public readonly begin: HTMLButtonElement;
    public readonly question: HTMLDivElement;
    public readonly submit: HTMLButtonElement;
    public readonly next: HTMLButtonElement;
    public readonly result: HTMLDivElement;
    public readonly questionText: HTMLPreElement;
    public readonly answerText: HTMLTextAreaElement;
    public readonly answerLabel: HTMLLabelElement;
    public readonly correct: HTMLLabelElement;
    public readonly wrong: HTMLLabelElement;

    public constructor() {
        this.start = document.getElementById("quizzer-start") as HTMLDivElement;
        this.begin = document.getElementById("quizzer-begin") as HTMLButtonElement;
        this.question = document.getElementById("quizzer-question") as HTMLDivElement;
        this.submit = document.getElementById("quizzer-submit") as HTMLButtonElement;
        this.next = document.getElementById("quizzer-next") as HTMLButtonElement;
        this.result = document.getElementById("quizzer-result") as HTMLDivElement;
        this.questionText = document.getElementById("quizzer-questionText") as HTMLPreElement;
        this.answerText = document.getElementById("quizzer-answerText") as HTMLTextAreaElement;
        this.answerLabel = document.getElementById("quizzer-answerLabel") as HTMLLabelElement;
        this.correct = document.getElementById("quizzer-correct") as HTMLLabelElement;
        this.wrong = document.getElementById("quizzer-wrong") as HTMLLabelElement;

        this.show(this.start);
        this.show(document.getElementById("quizzer") as HTMLDivElement);
    }

    public show(element: HTMLElement): void {
        element.classList.remove("hide");
    }

    public showMany(...elements: HTMLElement[]): void {
        elements.forEach(e => e.classList.remove("hide"));
    }

    public hide(element: HTMLElement): void {
        element.classList.add("hide");
    }

    public hideMany(...elements: HTMLElement[]): void {
        elements.forEach(e => e.classList.add("hide"));
    }

    public disable(element: HTMLTextAreaElement): void {
        element.disabled = true;
    }

    public enable(element: HTMLTextAreaElement): void {
        element.disabled = false;
    }

    public bind(button: HTMLButtonElement, handler: () => void): void {
        button.onclick = handler;
    }

    public unbind(button: HTMLButtonElement): void {
        button.onclick = null;
    }

    public setText(element: HTMLPreElement | HTMLLabelElement, text: string): void {
        element.innerText = text;
    }

    public getInput(element: HTMLTextAreaElement | HTMLInputElement): string {
        return element.value;
    }

    public clearInput(element: HTMLTextAreaElement | HTMLInputElement): void {
        element.value = "";
    }

    public renderAnswerTable(answers: Answer[]): void {
        const table = document.getElementById("quizzer-table") as HTMLElement;
        answers.forEach(answer => {
            const row = document.createElement("tr");

            const tdQuestionId = document.createElement("td");
            tdQuestionId.innerText = "#" + answer.questionNumber.toString();
            row.append(tdQuestionId);

            const tdAnswer = document.createElement("td");
            const lblAnswer = document.createElement("label")
            lblAnswer.innerText = answer.answer;
            tdAnswer.append(lblAnswer);
            row.append(tdAnswer);

            const tdInput = document.createElement("td");
            const lblInput = document.createElement("label")
            lblInput.innerText = answer.input;
            tdInput.append(lblInput);
            row.append(tdInput);

            const tdCorrect = document.createElement("td");
            const lblCorrect = document.createElement("label")
            lblCorrect.innerText = answer.correct ? "✔️" : "❌";
            tdCorrect.append(lblCorrect);
            row.append(tdCorrect);

            table.append(row);
        });
    }
}
