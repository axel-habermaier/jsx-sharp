using System.Linq.Expressions;
using System.Reflection;
using System.Runtime.CompilerServices;
using Cs2Ts;

var writer = new CodeWriter();
writer.AppendLine("// Generated code - do not edit!");
writer.AppendLine();

var types = new List<TsType>
{
    new(typeof(List<>))
    {
        ExtensionsSource = typeof(Enumerable),
        ExtensionTargetTypes = { typeof(IEnumerable<>) },
        ImplementedInterfaces = {typeof(IEnumerable<>)},
        SuppressedMethods = {typeof(List<>).GetMethod("get_Count")!}
    },
    new(typeof(IEnumerable<>))
    {
        ExtensionsSource = typeof(Enumerable),
        ExtensionTargetTypes = { typeof(IEnumerable<>) }
    },
    new(typeof(Dictionary<,>)),
    new(typeof(Predicate<>)),
    new(typeof(Guid)),
    new(typeof(byte)),
    new(typeof(sbyte)),
    new(typeof(ushort)),
    new(typeof(short)),
    new(typeof(uint)),
    new(typeof(int)),
    new(typeof(ulong)),
    new(typeof(long)),
    new(typeof(float)),
    new(typeof(double)),
    new(typeof(decimal)),
    new(typeof(void)),
    new(typeof(bool)),
    new(typeof(string)),
    new(typeof(Nullable<>)),
    new(typeof(StringSplitOptions)),
    new(typeof(object)),
    new(typeof(Enum)),
    new(typeof(Array)){
        ExtensionsSource = typeof(Enumerable),
        ExtensionTargetTypes = { typeof(IEnumerable<>) },
        ImplementedInterfaces = {typeof(IEnumerable<>)}
    },
    new(typeof(Enumerable)),
    new(typeof(Queryable)),
    new(typeof(IOrderedEnumerable<>))
    {
        ExtensionsSource = typeof(Enumerable),
        ExtensionTargetTypes = { typeof(IOrderedEnumerable<>), typeof(IEnumerable<>) },
        ImplementedInterfaces = {typeof(IEnumerable<>)}
    },
    new(typeof(IQueryable<>))
    {
        ExtensionsSource = typeof(Queryable),
        ExtensionTargetTypes = { typeof(IQueryable<>) }
    },
    new(typeof(IOrderedQueryable<>))
    {
        ExtensionsSource = typeof(Queryable),
        ExtensionTargetTypes = { typeof(IQueryable<>), typeof(IOrderedQueryable<>) }
    },
    new(typeof(Task<>)) { MakeGenericsOptional = true },
    new(typeof(ValueTask<>)) { MakeGenericsOptional = true },
    new(typeof(CancellationToken))
};

var knownTypes = new HashSet<Type>(types.Select(type => type.Type));

foreach (var tsType in types)
{
    var type = tsType.Type;

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
        TranspileTypeReference(writer, type, false);
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
        TranspileDeclarationTypeName(writer, type, tsType.MakeGenericsOptional);
        if (type.BaseType != null && type.BaseType != typeof(ValueType) && IsKnownType(type.BaseType))
        {
            writer.Append(" extends ");
            TranspileTypeReference(writer, type.BaseType, false);
        }

        var genericArguments = type.GetGenericArguments();
        if (tsType.ImplementedInterfaces.Count > 0)
        {
            writer.Append(type.IsInterface ? " extends " : " implements ");
            writer.AppendSeparated(tsType.ImplementedInterfaces, () => writer.Append(", "),
                i => TranspileTypeReference(writer, i, false));
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

            var extensions = new List<MethodInfo>(tsType.ExtensionsSource != null
                    ? tsType.ExtensionsSource.GetMethods()
                        : Array.Empty<MethodInfo>())
                .Where(m => m.IsStatic && m.GetParameters().Length > 0)
                .Where(m =>
                {
                    var thisParameter = m.GetParameters()[0];
                    var thisType = thisParameter.ParameterType.IsConstructedGenericType
                        ? thisParameter.ParameterType.GetGenericTypeDefinition()
                        : thisParameter.ParameterType;

                    return tsType.ExtensionTargetTypes.Contains(thisType);
                })
                .Where(m => m.GetGenericArguments().Length > 0);

            writer.AppendSeparated(constructors,
                () => writer.AppendLine(),
                c => TranspileMethod(writer, genericArguments, "constructor", false, false, Array.Empty<Type>(),
                    c.GetParameters(), null, t => t));

            if (constructors.Length > 0)
            {
                writer.AppendLine();
            }

            writer.AppendSeparated(
                ownMethods.Concat(interfaceMethods).Concat(extensions)
                    .Where(m => !tsType.SuppressedMethods.Contains(m))
                    .DistinctBy(m =>
                    {
                        // We compare strings here to filter out redundant method declarations originating from the
                        // type and its interfaces. At the symbol level, we would have to figure out if some 
                        // generic argument `T` from the class itself or one of its interfaces are the same. At the
                        // syntax level, that's easy.
                        var returnType = TranspileToString(w => TranspileTypeReference(w, m.ReturnType, false));
                        var parameterTypes = m.GetParameters().Select(p =>
                            TranspileToString(w => TranspileTypeReference(w, p.ParameterType, false)));
                        return (m.Name, returnType, string.Join(", ", parameterTypes));
                    })
                    .OrderBy(m => m.Name),
                () => writer.AppendLine(),
                m =>
                {
                    if (m.GetCustomAttribute<ExtensionAttribute>() != null)
                    {
                        // We're injecting extension methods
                        var methodThisType = m.GetGenericArguments()[0];
                        var typeThisType = type.GetGenericArguments()[0];
                        TranspileMethod(writer, genericArguments, m.Name, false, false,
                            m.GetGenericArguments().Skip(1).ToArray(), m.GetParameters().Skip(1).ToArray(), m.ReturnType, t => t == methodThisType ? typeThisType : t);
                    }
                    else
                    {
                        TranspileMethod(writer, genericArguments, m.Name, m.IsSpecialName, m.IsStatic,
                            m.GetGenericArguments(), m.GetParameters(), m.ReturnType, t => t);
                    }
                });
        });
        writer.AppendLine();
        writer.AppendLine("}");
        writer.AppendLine();
    }
}

writer.ToFile("../../../../Examples/generated-types.d.ts");

void TranspileMethod(CodeWriter writer, Type[] containingTypeGenericArguments, string name, bool isSpecialName,
    bool isStatic, Type[] genericArguments, ParameterInfo[] parameters, Type? returnType, Func<Type, Type> mapType)
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
    TranspileGenericArguments(writer, genericArguments, false);

    writer.Append("(");

    if (parameters?.Length > 0)
    {
        writer.AppendSeparated(parameters, () => writer.Append(", "), p =>
        {
            writer.Append($"{(p.Name == "function" ? "func" : p.Name)}: ");
            TranspileTypeReferenceOrUnknown(writer, p.ParameterType, mapType);
        });
    }

    writer.Append(")");
    if (!isSetter && returnType != null)
    {
        writer.Append(": ");
        TranspileTypeReferenceOrUnknown(writer, returnType, mapType);
    }

    writer.Append(";");
}

void TranspileDeclarationTypeName(CodeWriter writer, Type type, bool makeGenericsOptional)
{
    if (type == typeof(Array))
    {
        writer.Append("Array<T = never>");
    }
    else if (type.IsPrimitive || type == typeof(decimal) || type == typeof(void) || type == typeof(string))
    {
        writer.Append(type.Name);
    }
    else if (type.IsConstructedGenericType)
    {
        TranspileTypeReference(writer, type.GetGenericTypeDefinition(), makeGenericsOptional);
    }
    else
    {
        TranspileTypeReference(writer, type, makeGenericsOptional);
    }
}

void TranspileTypeReferenceOrUnknown(CodeWriter writer, Type type, Func<Type, Type> mapType)
{
    if (IsKnownType(type) || type.IsGenericMethodParameter || type.IsGenericTypeParameter)
    {
        TranspileTypeReference(writer, type, false, mapType);
    }
    else
    {
        writer.Append("unknown /*");
        TranspileTypeReference(writer, type, false, mapType);
        writer.Append("*/");
    }
}

void TranspileTypeReference(CodeWriter writer, Type type, bool makeGenericsOptional, Func<Type, Type>? mapType = null)
{
    if (type.IsArray)
    {
        TranspileTypeReference(writer, type.GetElementType()!, makeGenericsOptional, mapType);
        writer.Append("[]");
    }
    else if (type.IsConstructedGenericType && type.GetGenericTypeDefinition() == typeof(Nullable<>))
    {
        TranspileTypeReference(writer, type.GetGenericArguments()[0], makeGenericsOptional, mapType);
        writer.Append(" | null");
    }
    else if (type.IsConstructedGenericType && type.GetGenericTypeDefinition() == typeof(Expression<>))
    {
        // We compile expressions away
        TranspileFunctionType(writer, type.GetGenericArguments()[0]);
    }
    else if (IsFunctionType(type))
    {
        TranspileFunctionType(writer, type);
    }
    else
    {
        type = mapType?.Invoke(type) ?? type;
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
        TranspileGenericArguments(writer, type.GetGenericArguments(), makeGenericsOptional);
    }
}

void TranspileGenericArguments(CodeWriter writer, Type[]? typeArguments, bool makeGenericsOptional)
{
    if (typeArguments?.Length > 0)
    {
        writer.Append("<");
        writer.AppendSeparated(typeArguments, () => writer.Append(", "), t =>
        {
            TranspileTypeReference(writer, t, false);
            if (makeGenericsOptional)
            {
                writer.Append(" = unknown");
            }
        });
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
        TranspileTypeReference(writer, p.ParameterType, false);
    });
    writer.Append(") => ");
    TranspileTypeReference(writer, invokeMethod.ReturnType, false);
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

    if (type.IsConstructedGenericType && type.GetGenericTypeDefinition() == typeof(Expression<>))
    {
        return IsKnownType(type.GetGenericArguments()[0]);
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

internal class TsType
{
    public TsType(Type type)
    {
        Type = type;
    }

    public Type Type { get; set; }
    public bool MakeGenericsOptional { get; set; }
    public Type? ExtensionsSource { get; set; }
    public List<Type> ExtensionTargetTypes { get; set; } = new();
    public List<Type> ImplementedInterfaces { get; set; } = new();
    public List<MethodBase> SuppressedMethods { get; set; } = new();
}