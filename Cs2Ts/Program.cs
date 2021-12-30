using System.Reflection;
using System.Runtime.CompilerServices;
using Cs2Ts;

var writer = new CodeWriter();
writer.AppendLine("// Generated code - do not edit!");
writer.AppendLine();

var allowList = new HashSet<string>
{
    "System.Collections.Generic.List`1",
    "System.Collections.Generic.IEnumerable`1",
    "System.Collections.Generic.Dictionary`2",
    "System.Collections.Generic.HashSet`1",
    "System.Predicate`1",
    "System.Guid",
    "System.Byte",
    "System.SByte",
    "System.UInt16",
    "System.Int16",
    "System.UInt32",
    "System.Int32",
    "System.UInt64",
    "System.Int64",
    "System.Single",
    "System.Double",
    "System.Decimal",
    "System.Void",
    "System.Boolean",
    "System.String",
    "System.Nullable`1",
    "System.StringSplitOptions",
    "System.Object",
    "System.Enum",
    "System.Threading.Tasks.Task",
    "System.Threading.Tasks.Task`1",
    "System.Threading.Tasks.ValueTask",
    "System.Threading.Tasks.ValueTask`1",
    "System.Threading.Tasks.TaskCreationOptions",
    "System.Threading.CancellationToken",
    "System.Linq.Enumerable"
};

var knownTypes = AppDomain.CurrentDomain.GetAssemblies()
    .SelectMany(a => a.GetTypes())
    .Where(t => t.IsPublic && allowList.Contains(t.FullName ?? ""))
    .ToHashSet();

var typesToTranspile = new List<Type>(knownTypes);

foreach (var type in allowList.Where(t1 => knownTypes.All(t2 => t2.FullName != t1)))
{
    Console.WriteLine($"Error: Type '{type}' could not be found.");
}

foreach (var type in knownTypes.ToArray())
{
    CollectBaseTypes(type);
}

while (typesToTranspile.Count > 0)
{
    var type = typesToTranspile[^1];
    typesToTranspile.RemoveAt(typesToTranspile.Count - 1);

    if (type.IsEnum)
    {
        writer.AppendLine($"declare enum {type.Name} {{");
        writer.AppendIndented(() =>
        {
            writer.AppendSeparated(type.GetEnumNames(), () => writer.AppendLine(","), l => writer.Append(l));
        });
        writer.AppendLine();
        writer.AppendLine("}");
        writer.AppendLine();
    }
    else if (type.BaseType == typeof(MulticastDelegate))
    {
        writer.Append("declare type ");
        TranspileTypeReference(writer, type);
        writer.Append(" = ");
        TranspileFunctionType(writer, type);
        writer.AppendLine(";");
        writer.AppendLine();
    }
    else if (type.IsClass || type.IsInterface || type.IsValueType)
    {
        writer.Append("declare ");
        if (type.IsAbstract && !type.IsInterface)
        {
            writer.Append("abstract ");
        }

        writer.Append($"{(type.IsInterface ? "interface" : "class")} ");
        TranspileDeclarationTypeName(writer, type);
        if (type.BaseType != null && type.BaseType != typeof(ValueType))
        {
            writer.Append(" extends ");
            TranspileTypeReference(writer, type.BaseType);
        }

        var genericArguments = type.GetGenericArguments();
        var interfaces = type.GetInterfaces().Where(IsKnownType).ToArray();
        if (interfaces.Length > 0)
        {
            writer.Append(type.IsInterface ? " extends " : " implements ");
            writer.AppendSeparated(interfaces, () => writer.Append(", "), i => TranspileTypeReference(writer, i));
        }

        writer.AppendLine(" {");
        writer.AppendIndented(() =>
        {
            var constructors = type.GetConstructors(BindingFlags.Public | BindingFlags.Instance);
            var ownMethods = type.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static |
                                             BindingFlags.DeclaredOnly)
                .Where(m => m.GetCustomAttribute<ExtensionAttribute>() == null);
            var interfaceMethods = type.GetInterfaces()
                .Where(IsKnownType)
                .SelectMany(i => i.GetMethods(BindingFlags.Public | BindingFlags.Instance));

            writer.AppendSeparated(constructors,
                () => writer.AppendLine(),
                c => TranspileMethod(writer, genericArguments, "constructor", false, false, Array.Empty<Type>(),
                    c.GetParameters(), null));

            if (constructors.Length > 0)
            {
                writer.AppendLine();
            }

            writer.AppendSeparated(
                ownMethods.Concat(interfaceMethods)
                    .DistinctBy(m =>
                    {
                        // We compare strings here to filter out redundant method declarations originating from the
                        // type and its interfaces. At the symbol level, we would have to figure out if some 
                        // generic argument `T` from the class itself or one of its interfaces are the same. At the
                        // syntax level, that's easy.
                        var returnType = TranspileToString(w => TranspileTypeReference(w, m.ReturnType));
                        var parameterTypes = m.GetParameters().Select(p =>
                            TranspileToString(w => TranspileTypeReference(w, p.ParameterType)));
                        return (m.Name, returnType, string.Join(", ", parameterTypes));
                    })
                    .OrderBy(m => m.Name),
                () => writer.AppendLine(),
                m => TranspileMethod(writer, genericArguments, m.Name, m.IsSpecialName, m.IsStatic,
                    m.GetGenericArguments(), m.GetParameters(), m.ReturnType));
        });
        writer.AppendLine();
        writer.AppendLine("}");
        writer.AppendLine();

        var extensionMethods = type.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static |
                                               BindingFlags.DeclaredOnly)
            .Where(m => m.GetCustomAttribute<ExtensionAttribute>() != null);

        foreach (var m in extensionMethods)
        {
            writer.Append("declare interface ");
            TranspileDeclarationTypeName(writer, m.GetParameters()[0].ParameterType);
            writer.AppendLine(" {");
            writer.AppendIndented(() =>
            {
                TranspileMethod(writer, genericArguments, m.Name, false, false, m.GetGenericArguments(), m.GetParameters().Skip(0).ToArray(), m.ReturnType);
            });
            writer.AppendLine("}");
            writer.AppendLine();
        }
    }
}

writer.ToFile("../../../../Examples/generated-types.d.ts");

void TranspileMethod(CodeWriter writer, Type[] containingTypeGenericArguments, string name, bool isSpecialName,
    bool isStatic, Type[] genericArguments, ParameterInfo[] parameters, Type? returnType)
{
    var referencedTypes = parameters.Select(p => p.ParameterType)
        .Concat(returnType == null ? Array.Empty<Type>() : new[] { returnType }).ToArray();

    if (isSpecialName && name.StartsWith("op_"))
    {
        writer.AppendLine("// Unsupported operator declaration.");
        writer.Append("// ");
    }
    else if (referencedTypes.Any(t => t.IsByRef || t.IsPointer))
    {
        writer.AppendLine("// Unsupported byRef/pointer parameter or return type.");
        writer.Append("// ");
    }
    // TODO: MUST BE RECURSIVE!
    else if (isStatic && referencedTypes.Any(t => containingTypeGenericArguments.Contains(t)))
    {
        writer.AppendLine("// Unsupported reference to containing type's generic parameter.");
        writer.Append("// ");
    }

    var isGetter = isSpecialName && name.StartsWith("get_");
    var isSetter = isSpecialName && name.StartsWith("set_");

    if (isGetter && parameters.Length > 0 || isSetter && parameters.Length > 1)
    {
        writer.AppendLine("// Unsupported index accessor.");
        writer.Append("// ");
    }

    if (isStatic)
    {
        writer.Append("static ");
    }

    if (isGetter)
    {
        writer.Append("get ");
        name = name[4..];
    }

    if (isSetter)
    {
        writer.Append("set ");
        name = name[4..];
    }

    writer.Append(name);
    TranspileGenericArguments(writer, genericArguments);

    writer.Append("(");

    if (parameters?.Length > 0)
    {
        writer.AppendSeparated(parameters, () => writer.Append(", "), p =>
        {
            writer.Append($"{(p.Name == "function" ? "func" : p.Name)}: ");
            TranspileTypeReferenceOrUnknown(writer, p.ParameterType);
        });
    }

    writer.Append(")");
    if (!isSetter && returnType != null)
    {
        writer.Append(": ");
        TranspileTypeReferenceOrUnknown(writer, returnType);
    }

    writer.Append(";");
}

void CollectBaseTypes(Type type)
{
    if (type.IsValueType || type.IsEnum || type.BaseType == typeof(MulticastDelegate))
    {
        return;
    }

    // We always transpile all base types to get the type hierarchy correct
    while (type.BaseType != null)
    {
        if (knownTypes.Add(type))
        {
            typesToTranspile.Add(type);
        }

        type = type.BaseType;
    }
}

void TranspileDeclarationTypeName(CodeWriter writer, Type type)
{
    if (type == typeof(Array))
    {
        writer.Append("Array<T = unknown>");
    }
    else if (type.IsPrimitive || type == typeof(decimal) || type == typeof(void) || type == typeof(string))
    {
        writer.Append(type.Name);
    }
    else if (type.IsConstructedGenericType)
    {
        TranspileTypeReference(writer, type.GetGenericTypeDefinition());
    }
    else
    {
        TranspileTypeReference(writer, type);
    }
}

void TranspileTypeReferenceOrUnknown(CodeWriter writer, Type type)
{
    if (IsKnownType(type) || type.IsGenericMethodParameter || type.IsGenericTypeParameter)
    {
        TranspileTypeReference(writer, type);
    }
    else
    {
        writer.Append("unknown /*");
        TranspileTypeReference(writer, type);
        writer.Append("*/");
    }
}

void TranspileTypeReference(CodeWriter writer, Type type)
{
    if (type.IsArray)
    {
        TranspileTypeReference(writer, type.GetElementType()!);
        writer.Append("[]");
    }
    else if (type.IsConstructedGenericType && type.GetGenericTypeDefinition() == typeof(Nullable<>))
    {
        TranspileTypeReference(writer, type.GetGenericArguments()[0]);
        writer.Append(" | null");
    }
    else if (IsFunctionType(type))
    {
        TranspileFunctionType(writer, type);
    }
    else
    {
        var name = type.Name switch
        {
            "Byte" => "byte",
            "SByte" => "sbyte",
            "UInt16" => "ushort",
            "Int16" => "short",
            "UInt32" => "uint",
            "Int32" => "int",
            "UInt64" => "ulong",
            "Int64" => "long",
            "Single" => "float",
            "Double" => "double",
            "Char" => "char",
            "String" => "string",
            "Void" => "void",
            "Boolean" => "boolean",
            { } n when type.Name.Contains('`') => n[..type.Name.IndexOf('`')],
            { } n => n
        };
        writer.Append(name);
        TranspileGenericArguments(writer, type.GetGenericArguments());
    }
}

void TranspileGenericArguments(CodeWriter writer, Type[]? typeArguments)
{
    if (typeArguments?.Length > 0)
    {
        writer.Append("<");
        writer.AppendSeparated(typeArguments, () => writer.Append(", "), t => TranspileTypeReference(writer, t));
        writer.Append(">");
    }
}

void TranspileFunctionType(CodeWriter writer, Type delegateType)
{
    var invokeMethod = delegateType.GetMethod("Invoke")!;

    writer.Append("(");
    var i = 0;
    writer.AppendSeparated(invokeMethod.GetParameters(), () => writer.Append(", "), p =>
    {
        writer.Append(string.IsNullOrWhiteSpace(p.Name) ? $"arg{i++}" : p.Name);
        writer.Append(": ");
        TranspileTypeReference(writer, p.ParameterType);
    });
    writer.Append(") => ");
    TranspileTypeReference(writer, invokeMethod.ReturnType);
}

string TranspileToString(Action<CodeWriter> write)
{
    var writer = new CodeWriter();
    write(writer);
    return writer.ToString();
}

bool IsKnownType(Type type)
{
    if (knownTypes.Contains(type))
    {
        return true;
    }

    if (type.IsConstructedGenericType)
    {
        return type.GetGenericArguments().All(IsKnownType) && IsKnownType(type.GetGenericTypeDefinition());
    }

    if (type.IsArray)
    {
        return IsKnownType(type.GetElementType()!);
    }

    if (type.IsGenericMethodParameter || type.IsGenericTypeParameter)
    {
        return true;
    }

    if (IsFunctionType(type))
    {
        return true;
    }

    return false;
}

bool IsFunctionType(Type type)
{
    return type.Namespace == "System" && (type.Name.StartsWith("Func`") ||
                                          type.Name.StartsWith("Action`") ||
                                          type.Name == "Action");
}