using System.Runtime.CompilerServices;
using System.Text;
using static JsxSharp.JsxRuntime3.JsxCtx;
namespace JsxSharp.JsxRuntime3;

public record class Questionnaire(int id, string questions)
{
}

[InterpolatedStringHandler]
public struct JsxInterpolatedStringHandler
{
    private readonly StringBuilder b;

    public JsxInterpolatedStringHandler(int literalLength, int formattedCount, StringBuilder b)
    {
        this.b = b;
    }

    public void AppendLiteral(string value)
    {
        b.Append(value);
    }


    public void AppendFormatted<T>(T value)
    {
        if (value is bool)
        {
            return;
        }

        if (value is Func<StringBuilder, object> f)
        {
            f(b);
        }

        else if (value != null)
        {
            b.Append(value);
        }
    }

    public void AppendFormatted(string? value)
    {
        if (value != null)
        {
            b.Append(value);
        }
    }

    public void AppendFormatted(bool value)
    {
    }

    public void AppendFormatted(IEnumerable<Func<StringBuilder, object>> s)
    {
        foreach (var t in s)
        {
            t(b);
        }
    }

    public string ToStringAndClear()
    {
        return b.ToString();
    }
}

public static class JsxCtx
{
    public static AsyncLocal<HttpContext> Context = new();

    public static T UseService<T>()
    {
        return (T)Context.Value.RequestServices.GetService(typeof(T));
    }
}

public class DirectJsx
{
    public static object Guard = new object();

    public static object Jsx(StringBuilder b,
        [InterpolatedStringHandlerArgument("b")]
        ref JsxInterpolatedStringHandler handler)
    {
        return Guard;
    }

    public static object Document(string title, Func<StringBuilder, object> children)
    {
        Console.WriteLine(JsxCtx.Context.Value.Request.RouteValues.Values.First());
        Console.WriteLine(UseService<IWebHostEnvironment>().EnvironmentName);
        return children;
    }

    public static void QuestionnaireEditor(WebApplication app)
    {
        var questionnaires = new List<Questionnaire>();
        Questionnaire current = null!;
        for (var i = 0; i < 50000; ++i)
        {
            questionnaires.Add(new(id: i, questions: i.ToString()));
        }

        app.MapGet("/directjsx/{id?}", (int? id, HttpContext ctx) =>
        {
            var q = (StringBuilder b) => Jsx(b, $@"
            {Document(title: "Questionnaire Editor", children: b => Jsx(b, $@"
                <h3>Fragebögen</h3>
                <form method=""post"" action=""/questionnaire-editor/add"">
                    <button type=""submit"">Neu</button>
                </form>
                <ul>
                    {questionnaires.Select(q => (Func<StringBuilder, object>)(b => Jsx(b, $@"<li>
                            <a href={$"/directjsx/{q.id}"}>{q.id}</a>
                            {JsxHelper.And(id == q.id, (StringBuilder b) => Jsx(b, $@"<b>(current) {JsxHelper.And(id, "-")}</b>"))}
                        </li>")))}
                </ul>
                <turbo-frame id=""edit-form"">
                    <form method=""post"" action=""/questionnaire-editor/save"" autoComplete=""off"">
                        <input type=""hidden"" name=""id"" value={current?.id} />
                        <textarea
                            cols={40}
                            rows={10}
                            name=""questions""
                            data-action=""show-preview#show""
                        >
                            {current?.questions}
                        </textarea>
                        <button type=""submit"">Save</button>
                        <button
                            data-show-preview-target=""btn""
                            type=""submit""
                            asp-page-handler=""preview""
                            data-turbo-frame=""preview""
                        >
                            Preview
                        </button>

                        <div data-show-preview-target=""output""></div>

                        <turbo-frame id=""preview""></turbo-frame>
                    </form>
                </turbo-frame>
            "))}");

            JsxCtx.Context.Value = ctx;
            var sb = new StringBuilder();
            q(sb);
            return Results.Content(sb.ToString(), "text/html");
        });
    }
}