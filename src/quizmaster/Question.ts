export enum QuestionType {
    Locate = 0,
    Name = 1,
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

    public constructor (id: number, labelId: number) {
      this.id = id;
      this.labelId = labelId;
    }
}

export class QuestionName implements Question {
    public readonly questionType = QuestionType.Name;
    public readonly id: number;
    public textPrompt = "";
    public textAnswer = "";
    public labelId: number;

    public constructor (id: number, labelId: number) {
      this.id = id;
      this.labelId = labelId;
    }
}

export function GetQuestionTypeName (questionType: QuestionType): string {
  switch (questionType) {
    case QuestionType.Locate:
      return "Locate the region";
    case QuestionType.Name:
      return "Name the region";
  }
}
