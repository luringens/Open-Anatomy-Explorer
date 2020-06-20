export enum QuestionType {
    Locate,
    Name,
}

export interface Question {
    questionType: QuestionType;
    textPrompt: string;
    labelId: number;
}

export class QuestionLocate implements Question {
    public readonly questionType = QuestionType.Locate;
    public textPrompt = "";
    public labelId = 0;
    public showRegions = true;
}

export class QuestionName implements Question {
    public readonly questionType = QuestionType.Name;
    public textPrompt = "";
    public labelId = 0;
}
