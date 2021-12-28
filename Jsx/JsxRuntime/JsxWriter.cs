namespace JsxSharp.JsxRuntime;

public class JsxWriter : IAsyncDisposable
{
    private readonly StreamWriter _writer;

    public JsxWriter(Stream stream)
    {
        _writer = new StreamWriter(stream);
        _writer.Write("<!DOCTYPE html>");
    }

    public JsxWriter Append(string? s)
    {
        if (s != null)
        {
            _writer.Write(s);
        }

        return this;
    }

    public JsxWriter Append(object? o)
    {
        if (o is JsxNode node)
        {
            return Append(node);
        }

        if (o is JsxElement element)
        {
            element(this);
            return this;
        }

        if (o is bool b)
        {
            // Boolean values result in no output.
            return this;
        }

        return Append(o?.ToString());
    }

    public JsxWriter Append<T>(T t) where T : struct => Append(t.ToString());

    public JsxWriter Append<T>(T? t) where T : struct => Append(t?.ToString());

    public JsxWriter Append(JsxElement element)
    {
        element(this);
        return this;
    }

    public JsxWriter Append(JsxWriter? writer)
    {
        // There's nothing to invoke here. This method is only needed because the structure of the 
        // generated code sometimes requires it.
        return this;
    }

    public JsxWriter Append(JsxNode? node)
    {
        node?.WriteTo(this);
        return this;
    }

    public JsxWriter Append(IEnumerable<JsxElement>? elements)
    {
        foreach (var element in elements ?? Array.Empty<JsxElement>())
        {
            Append(element);
        }

        return this;
    }

    public ValueTask DisposeAsync()
    {
        return _writer.DisposeAsync();
    }
}
