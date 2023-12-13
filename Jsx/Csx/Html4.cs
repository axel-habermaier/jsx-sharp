namespace JsxSharp.Csx4;

using System.Diagnostics;
using System.Text;
using static Html;

public record Base()
{
    private string t;

    public static implicit operator Base(string s)
    {
        return new Base() { t = s };
    }

    public virtual void Write(StringBuilder b, bool attrs)
    {
        if (!attrs)
            b.Append(t);
    }
};

public record Attr(string Value) : Base
{
    public override void Write(StringBuilder b, bool attrs)
    {
        if (attrs)
        {
            b.Append(' ');
            b.Append(Value);
        }
    }
}

public record Node(string Value, Base[] Children) : Base
{
    public override void Write(StringBuilder b, bool attrs)
    {
        if (!attrs)
        {
            b.Append($"<{Value}");
            foreach (var c in Children)
                c.Write(b, true);
            b.Append(">");
            foreach (var c in Children)
                c.Write(b, false);
            b.Append($"</{Value}>");
        }
    }
}

public static class Html
{
    static Attr attr(string name, string value)
    {
        return new($"{name}=\"{value}\"");
    }

    public static Attr href(string value) => attr("href", value);

    public static Attr src(string value) => attr("src", value);

    public static Attr id(string value) => attr("id", value);

    public static Attr method(string value) => attr("method", value);

    public static Attr action(string value) => attr("action", value);

    public static Attr type(string value) => attr("type", value);

    static Node node(string tag, Base[] elements)
    {
        return new(tag, elements);
    }

    public static Node p(params Base[] children) => node("p", children);

    public static Node h3(params Base[] children) => node("h3", children);

    public static Node b(params Base[] children) => node("b", children);

    public static Node a(params Base[] children) => node("a", children);

    public static Node img(params Base[] children) => node("img", children);

    public static Node form(params Base[] children) => node("form", children);

    public static Node button(params Base[] children) => node("button", children);

    public static Node ul(params Base[] children) => node("ul", children);

    public static Node li(params Base[] children) => node("li", children);

    public static Node div(params Base[] children) => node("div", children);
}

// <form method="post" action="/questionnaire-editor/add">
//     <button type="submit">Neu</button>
// </form>
// <ul>
//     {questionnaires.Select((q) => (
//         <li>
//             <a href={`/svelte/${q.id}`}>{q.id}</a>
//             {id === q.id && <b>(current) {id && "-"}</b>}
//         </li>
//     ))}
// </ul>

public record class Questionnaire(int id, string questions) { }

public class Controller
{
    public static string Get(int someId)
    {
        List<Questionnaire> questionnaires = new();
        for (var i = 0; i < 5_000; ++i)
        {
            questionnaires.Add(new(id: i, questions: i.ToString()));
        }

        var sw = Stopwatch.StartNew();
        var dom = div(
            Test(showHeader: true, header: h3("Head")),
            p("Hallo Welt"),
            p(id("hi"), "Hallo Welt"),
            img(src("img.png")),
            form(id(someId.ToString()), method("post"), action("/editor/add")),
            button(type("submit"), "Submit"),
            ul(
                questionnaires
                    .Select(
                        q =>
                            li(
                                a(href($"svelte/{q.id}"), $"go to {q.id}"),
                                someId == q.id ? b(" (current)") : ""
                            )
                    )
                    .ToArray()
            )
        );
        var res = new StringBuilder();
        dom.Write(res, false);
        System.Console.WriteLine($"Render: {sw.Elapsed.TotalMilliseconds}ms");
        return res.ToString();
    }

    public static Base Test(bool showHeader, Node header)
    {
        return showHeader ? header : "";
    }
}
