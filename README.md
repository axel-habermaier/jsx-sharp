# JSX#

JSX# is an experimental cross compiler from TypeScript to C#, translating `type` definitions, module and function declarations, most kinds of statements, as well as pretty much all expressions, including JSX.

The compiler is implemented in TypeScript using the TypeScript compiler API. The goal was to gain a deeper understanding of how JSX works under the hood and how the performance compares between server-side React and the C# output of this tool. Spoiler alert: The transpiled C# code is around two orders of magnitude faster in some test scenarios.

There probably is no production use case for JSX#.

## Example

The following TypeScript code defines an exemplary JSX component and its props type.

```jsx
export type TestProps = {
    readonly items: string[];
};

export function TestComponent(props: TestProps): JsxElement {
    return (
        <p>
            Test{" "}
            {props.items.Select((item) => (
                <>{item}</>
            ))}
        </p>
    );
}
```

It is transpiled into the following C# code:

```csharp
public static class TestComponentModule
{
    public record class TestProps(string[] items) { }

    public static JsxElement TestComponent(TestProps props)
    {
        return ((JsxElement)(jsx => jsx
            .Append("<p>")
            .Append("Test")
            .Append(" ")
            .Append(props.items.Select((item) => ((JsxElement)(jsx => jsx.Append(item)))))
            .Append("</p>")
        ));
    }
}
```

Obviously, there are some optimization opportunities; the first three calls to `Append` could be unified into one.
Such optimizations, however, are not yet implemented.
