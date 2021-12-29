/*namespace JsxSharp.Csx2;

using static Html;

public static class Html
{
    private static HtmlElement _element;

    public static HtmlElement div(string? id = null, List<HtmlElement?>? children = null)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement div(params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement p(HtmlProps? props, params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement p(params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement b(HtmlProps? props, params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement b(params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement img(ImageProps props)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement ul(HtmlProps? props, params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement ul(HtmlProps? props, IEnumerable<HtmlElement> children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement ul(params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement ul(IEnumerable<HtmlElement> children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement li(HtmlProps? props, params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement li(params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement a(AnchorProps? props, params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement a(params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement form(FormProps? props, params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public static HtmlElement button(ButtonProps? props, params HtmlElement?[] children)
    {
        return _element.Append("<div></div>");
    }

    public record class FormProps(string method, string action, string? id = null) : HtmlProps
    {
    }

    public record class ButtonProps(string type) : HtmlProps
    {
    }

    public record class AnchorProps(string href) : HtmlProps
    {
    }

    public record class ImageProps(string src) : HtmlProps
    {
    }

    public record class HtmlProps(string? id = null)
    {
    }
}

public class HtmlElement
{
    public HtmlElement Append(string s)
    {
        return this;
    }

    public static implicit operator HtmlElement(string s) => null;
    public static implicit operator HtmlElement(int s) => null;
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

public record class Questionnaire(int id, string questions)
{
}



public class Controller
{
    public HtmlElement Get(int id)
    {
        var questionnaires = new List<Questionnaire>();

        return div(id: "div1", children: new()
        {
            p(children: new HtmlElement[] { "hallo Welt" })
        });
        //  p("Hallo Welt"),
        //  img(new(src: "img.png")),
        //  form(
        //      new(id: "form1", method: "post", action: "/editor/add"),
        //      button(new(type: "submit"))
        //  ),
        //  ul(questionnaires.Select(q =>
        //          li(
        //              a(new AnchorProps(href: $"svelte/{q.id}"), q.id),
        //              id == q.id ? b("(current)") : null
        //          )
        //      )
        //  )
        //);//
    }
}*/