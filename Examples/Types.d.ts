type byte = number;
type sbyte = number;
type short = number;
type ushort = number;
type int = number;
type uint = number;
type long = number;
type ulong = number;
type float = number;
type double = number;

type Guid = string;

type JsxKey = string | number;
type JsxNode = JsxNode[] | JsxElement | {} | string | number | boolean | null | undefined;
type JsxComponent<TProps> = (props: TProps) => JsxElement<any, any> | null;
type JsxElement<
    TProps = any,
    TComponent extends string | JsxComponent<TProps> = string | JsxComponent<TProps>
> = {
    type: TComponent;
    props: TProps;
    key: JsxKey | null;
};

interface Object {
    constructor: Function;
}

interface Function {}

interface String {
    Contains(other: string): boolean;
}

interface Boolean {}

interface Number {}

interface NewableFunction {}

interface RegExp {}

interface IArguments {}

interface CallableFunction {}

interface Array<T> extends IEnumerable<T> {
    Length: int;
}

interface ArrayConstructor {}

declare var Array: ArrayConstructor;

interface IEnumerable<T> {
    Select<U>(selector: (item: T) => U): IEnumerable<U>;
    Where(predicate: (item: T) => boolean): IEnumerable<T>;
    OrderBy<U>(predicate: (item: T) => U): IEnumerable<T>;
    ToArray(): T[];
}
