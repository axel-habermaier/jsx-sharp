namespace JsxSharp.JsxRuntime;

public abstract record class JsxNode
{
    public static implicit operator JsxNode(JsxElement element) => new JsxElementNode(element);

    public static implicit operator JsxNode(byte n) => new JsxLiteral<byte>(n);

    public static implicit operator JsxNode(sbyte n) => new JsxLiteral<sbyte>(n);

    public static implicit operator JsxNode(short n) => new JsxLiteral<short>(n);

    public static implicit operator JsxNode(ushort n) => new JsxLiteral<ushort>(n);

    public static implicit operator JsxNode(int n) => new JsxLiteral<int>(n);

    public static implicit operator JsxNode(uint n) => new JsxLiteral<uint>(n);

    public static implicit operator JsxNode(long n) => new JsxLiteral<long>(n);

    public static implicit operator JsxNode(ulong n) => new JsxLiteral<ulong>(n);

    public static implicit operator JsxNode(float n) => new JsxLiteral<float>(n);

    public static implicit operator JsxNode(double n) => new JsxLiteral<double>(n);

    public static implicit operator JsxNode(JsxNode[] nodes) => new JsxArrayNode(nodes);

    public abstract void WriteTo(JsxWriter writer);

    private record class JsxArrayNode(params JsxNode[] Nodes) : JsxNode
    {
        public override void WriteTo(JsxWriter writer)
        {
            foreach (var node in Nodes)
            {
                node.WriteTo(writer);
            }
        }
    }

    private record class JsxElementNode(JsxElement Element) : JsxNode
    {
        public override void WriteTo(JsxWriter writer)
        {
            Element(writer);
        }
    }

    private record class JsxLiteral<T>(T Literal) : JsxNode
    {
        public override void WriteTo(JsxWriter writer)
        {
            writer.Append(Literal);
        }
    }
}