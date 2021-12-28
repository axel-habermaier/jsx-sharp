import { Document } from "./Document";

export function QuestionnaireEditor(app: WebApplication): void {
    app.MapGet("/questionnaire-editor", (id: Guid | null) => {
        return Jsx(
            <Document title="Questionnaire Editor">
                Id: <b>{id}</b>
            </Document>
        );
    });
}
