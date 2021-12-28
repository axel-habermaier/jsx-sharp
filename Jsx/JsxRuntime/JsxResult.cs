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
        var writer = new JsxWriter();
        _element(writer);
        await writer.WriteTo(httpContext.Response);
    }


    public static IResult Jsx(JsxElement element)
    {
        return new JsxResult(element);
    }
}