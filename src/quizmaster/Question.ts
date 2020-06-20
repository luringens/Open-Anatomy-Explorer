export enum QuestionType {
    Locate,
    Name,
}

export interface Question {
    id: number;
    questionType: QuestionType;
    textPrompt: string;
    labelId: number;
}

export class QuestionLocate implements Question {
    public readonly questionType = QuestionType.Locate;
    public readonly id: number;
    public textPrompt = "";
    public labelId: number;
    public showRegions = true;

    public constructor(id: number) {
        this.id = id;
    }
}

export class QuestionName implements Question {
    public readonly questionType = QuestionType.Name;
    public readonly id: number;
    public textPrompt = "";
    public labelId: number;

    public constructor(id: number) {
        this.id = id;
    }
}
