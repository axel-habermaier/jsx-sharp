namespace JsxSharp.Csx3;

internal class div : HtmlElement
{
}

internal class p : HtmlElement
{
}

public class HtmlElement
{
    public string id { get; init; }
    public List<HtmlElement> children { get; init; }

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

        return new div
        {
            id = "div1", children =
            {
                new p
                {
                    children = { "Hallo Welt" }
                }
            }
        };
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
}