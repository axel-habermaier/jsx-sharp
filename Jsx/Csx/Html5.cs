namespace JsxSharp.Csx5;

using System.Diagnostics;
using System.Text;
using static Html;

public delegate void HtmlElement(StringBuilder b);

public static class Html
{
    public static HtmlElement group(params HtmlElement[] el)
    {
        return (b) => { };
    }

    public static HtmlElement text(string value)
    {
        return (b) => { };
    }

    public static HtmlElement div(string? id = null, HtmlElement? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement div(HtmlElement? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement div(params HtmlElement[] children)
    {
        return (b) => { };
    }

    public static HtmlElement p(string? id = null, HtmlElement? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement p(HtmlElement? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement p(string? id = null, string? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement p(string? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement h3(string? id = null, HtmlElement? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement h3(HtmlElement? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement b(string? id = null, HtmlElement? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement b(HtmlElement? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement img(string src = null, HtmlElement? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement ul(string? id = null, HtmlElement[] children = null)
    {
        return (b) => { };
    }

    public static HtmlElement ul(HtmlElement[] children = null)
    {
        return (b) => { };
    }

    public static HtmlElement ul(string? id = null, HtmlElement? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement li(string? id = null, HtmlElement? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement li(params HtmlElement[] children)
    {
        return (b) => { };
    }

    public static HtmlElement a(string href = null, HtmlElement? children = null)
    {
        return (b) => { };
    }

    public static HtmlElement form(
        string? method = null,
        string? action = null,
        string? id = null,
        HtmlElement? children = null
    )
    {
        return (b) => { };
    }

    public static HtmlElement button(string type = null, HtmlElement? children = null)
    {
        return (b) => { };
    }

    public record class FormProps() { }
}

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
            Test(showHeader: true, header: h3(text("Head"))),
            p("Hallo Welt"),
            p(id: "hi", text("Hallo Welt")),
            img(src: "img.png"),
            form(id: someId.ToString(), method: "post", action: "/editor/add"),
            button(type: "submit", text("Submit")),
            ul(
                questionnaires
                    .Select(
                        q =>
                            li(
                                a(href: $"svelte/{q.id}", children: text($"go to {q.id}")),
                                someId == q.id ? b(text(" (current)")) : text("")
                            )
                    )
                    .ToArray()
            )
        );
        var res = new StringBuilder();
        dom(res);
        System.Console.WriteLine($"Render: {sw.Elapsed.TotalMilliseconds}ms");
        return res.ToString();
    }

    public static HtmlElement Test(bool showHeader, HtmlElement header)
    {
        return showHeader ? header : text("");
    }
}
