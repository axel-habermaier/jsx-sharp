using System.Text;

namespace Cs2Ts;

internal sealed class CodeWriter
{
    private readonly StringBuilder _buffer = new();

    private bool _atBeginningOfLine = true;
    private int _indent;


    internal void Append(string s)
    {
        AddIndentation();
        _buffer.Append(s);
    }

    internal void AppendLine(string? s = null)
    {
        if (s != null)
        {
            Append(s);
        }

        _buffer.Append('\n');
        _atBeginningOfLine = true;
    }


    private void AddIndentation()
    {
        if (!_atBeginningOfLine)
        {
            return;
        }

        _atBeginningOfLine = false;
        for (var i = 0; i < _indent; ++i)
        {
            _buffer.Append("    ");
        }
    }

    internal void AppendIndented(Action content)
    {
        ++_indent;
        content();
        --_indent;
    }

    internal void AppendSeparated<T>(IEnumerable<T> items, Action separator, Action<T> writer)
    {
        var itemArray = items.ToArray();
        var idx = 0;

        foreach (var item in itemArray)
        {
            writer(item);
            if (idx != itemArray.Length - 1)
            {
                separator();
            }

            ++idx;
        }
    }

    internal void ToFile(string path)
    {
        var persistedContent = "";

        try
        {
            persistedContent = File.ReadAllText(path);
        }
        catch (Exception)
        {
            // We don't care about this exception and just write the file.
        }

        var currentContent = _buffer.ToString();

        if (persistedContent != currentContent)
        {
            File.WriteAllText(path, currentContent);
        }
    }

    public override string ToString()
    {
        return _buffer.ToString();
    }
}