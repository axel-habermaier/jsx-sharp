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

class Guid {
    __guid: string;
    public static get Empty(): Guid;
    public static get NewGuid(): Guid;
}

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

class Object {
    public ToString(): string;
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

class IEnumerable<T> {
    Select<U>(selector: (item: T) => U): IEnumerable<U>;
    Where(predicate: (item: T) => boolean): IEnumerable<T>;
    OrderBy<U>(predicate: (item: T) => U): IEnumerable<T>;
    ToArray(): T[];
    SingleOrDefault(): T | null;
}

interface Task<T> {
    /**
     * @deprecated This method does NOT exist at run-time and is only provided so that the TypeScript compiler does not complain about the use of `await`. Use `ContinueWith` instead.
     */
    then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1) | undefined | null,
        onrejected?: ((reason: any) => TResult2) | undefined | null
    ): Task<TResult1 | TResult2>;
}

interface Promise<T> extends Promise<T> {}

interface IWebHostEnvironment {
    get EnvironmentName(): string;
}

interface WebApplication {
    MapGet<TResult, T extends unknown[]>(route: string, handler: (...arg: T) => TResult): void;
    MapPost<TResult, T extends unknown[]>(route: string, handler: (...arg: T) => TResult): void;
}

function Jsx(element: JsxElement);

class List<T> extends IEnumerable<T> {
    Add(item: T): void;
    Remove(item: T | null): void;
}

class Results {
    public static Redirect(url: string): IActionResult;
}

type ModelBinder<T> = {
    Model: T | null;
};
