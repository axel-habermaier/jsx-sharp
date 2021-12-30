import { Document } from "./Document";

type Questionnaire = {
    readonly id: int;
    readonly questions: string;
};

export function QuestionnaireEditor(app: WebApplication): void {
    const questionnaires = new List<Questionnaire>();
    for (let i = 0; i < 50000; ++i) {
        questionnaires.Add({ id: i, questions: i.ToString() });
    }

    app.MapGet("/svelte/{id?}", (id: int | null) => {
        const current = questionnaires
            .Where((q) => q.id === id && q.questions !== "")
            .SingleOrDefault();
        let s = new Dictionary<int, string>();
        let q = s["hi"] as string;
        return Jsx(
            <Document title="Questionnaire Editor">
                <h3>Fragebögen</h3>
                <form method="post" action="/questionnaire-editor/add">
                    <button type="submit">Neu</button>
                </form>
                <ul>
                    {questionnaires.Select((q) => (
                        <li>
                            <a href={`/svelte/${q.id}`}>{q.id}</a>
                            {id === q.id && <b>(current) {id && "-"}</b>}
                        </li>
                    ))}
                </ul>
                <turbo-frame id="edit-form">
                    <form method="post" action="/questionnaire-editor/save" autoComplete="off">
                        <input type="hidden" name="id" value={current?.id} />
                        <textarea
                            cols={40}
                            rows={10}
                            name="questions"
                            data-action="show-preview#show"
                        >
                            {current?.questions}
                        </textarea>
                        <button type="submit">Save</button>
                        <button
                            data-show-preview-target="btn"
                            type="submit"
                            asp-page-handler="preview"
                            data-turbo-frame="preview"
                        >
                            Preview
                        </button>

                        <div data-show-preview-target="output"></div>

                        <turbo-frame id="preview"></turbo-frame>
                    </form>
                </turbo-frame>
            </Document>
        );
    });

    app.MapPost("/questionnaire-editor/add", () => {
        const id = 2;
        questionnaires.Add({ id, questions: "[]" });
        return Results.Redirect("/questionnaire-editor/" + id);
    });

    app.MapPost("/questionnaire-editor/save", (id: int, questions: string) => {
        const q = questionnaires.Where((q) => q.id === id).SingleOrDefault();
        questionnaires.Remove(q);
        questionnaires.Add({
            id: (id as int | null) ?? 0,
            questions: questions ?? "",
        });
        return Results.Redirect("/questionnaire-editor/" + id);
    });
}
