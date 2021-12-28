namespace JsxSharp.JsxRuntime;

public class JsxResult : IResult
{
    private readonly JsxElement _element;

    public JsxResult(JsxElement element)
    {
        _element = element;
    }

    public async Task ExecuteAsync(HttpContext httpContext)
    {
        httpContext.Response.ContentType = "text/html";
        await using var writer = new JsxWriter(httpContext.Response.Body);
        _element(writer);
    }


    public static IResult Jsx(JsxElement element)
    {
        return new JsxResult(element);
    }
}