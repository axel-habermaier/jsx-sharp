namespace JsxSharp.JsxRuntime;

public class JsxHelper
{
    // TODO: Diff by type!
    public static bool IsTruthy(object? o) => o != null;

    public static bool IsTruthy(bool b) => b;

    public static bool IsTruthy(string? s) => !string.IsNullOrEmpty(s);

    public static bool IsTruthy(byte n) => n != 0;

    public static bool IsTruthy(sbyte n) => n != 0;

    public static bool IsTruthy(ushort n) => n != 0;

    public static bool IsTruthy(short n) => n != 0;

    public static bool IsTruthy(int n) => n != 0;
    
    public static bool IsTruthy(uint n) => n != 0;

    public static bool IsTruthy(long n) => n != 0;

    public static bool IsTruthy(ulong n) => n != 0;

    public static bool IsTruthy(float n) => n != 0 && !float.IsNaN(n);

    public static bool IsTruthy(double n) => n != 0 && !double.IsNaN(n);

    public static bool And(bool lhs, bool rhs) => lhs && rhs;

    public static object? And(object? lhs, bool rhs) => IsTruthy(lhs) ? rhs : lhs;

    public static object? And(bool lhs, object? rhs) => lhs ? rhs : lhs;

    public static object? And(object? lhs, object? rhs) => IsTruthy(lhs) ? rhs : lhs;

    public static bool Or(bool lhs, bool rhs) => lhs || rhs;

    public static object? Or(object? lhs, bool rhs) => IsTruthy(lhs) ? lhs : rhs;

    public static object? Or(bool lhs, object? rhs) => lhs ? lhs : rhs;

    public static object? Or(object? lhs, object? rhs) => IsTruthy(lhs) ? lhs : rhs;
}