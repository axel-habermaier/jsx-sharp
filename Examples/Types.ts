export type byte = number;
export type sbyte = number;
export type short = number;
export type ushort = number;
export type int = number;
export type uint = number;
export type long = number;
export type ulong = number;
export type float = number;
export type double = number;

export type Guid = string;

export type JsxKey = string | number;
export type JsxNode = JsxNode[] | JsxElement | {} | string | number | boolean | null | undefined;
export type JsxComponent<TProps> = (props: TProps) => JsxElement<any, any> | null;
export type JsxElement<
    TProps = any,
    TComponent extends string | JsxComponent<TProps> = string | JsxComponent<TProps>
> = {
    type: TComponent;
    props: TProps;
    key: JsxKey | null;
};
