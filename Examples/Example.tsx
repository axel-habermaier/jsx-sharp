//declare function load(userId: Guid): Promise<Status>;

import * as XYZ from "./Example2";
import { OtherComponent, OtherComponentProps } from "./Example3";

//const X = 3;

//function printId(id: Guid): string {
//    return `hallot ${id.toString().toUpperCase()} welt ${[].map((y: number) => (y = 1))}`;
//}

type Status = "loggedIn" | "loggedOut" | "hi2sss";

type UserAvatarProps = {
    readonly userId: Guid;
    readonly name: string;
    readonly image?: string;
    readonly status: Status;
    readonly infos?: string[];
    readonly canBeNull: int | null;
    readonly recursiveNull: (string | null)[];
    readonly recursiveNullAll: (string | null)[] | null;
};

type TestProps = {
    readonly x: boolean;
    readonly y: int;
    readonly z?: JsxNode;
    readonly a?: int[];
    readonly children?: JsxNode;
};

function X(a: int | null, b: (string | null)[] | null): (string | null)[] | null {
    return null;
}

type User = {
    readonly id: int;
    readonly name: string;
};

export function Other(props: TestProps): JsxElement {
    const users: User[] = [];
    const l = (a: boolean) => !q(!a);

    function q(b: boolean): boolean {
        return !b;
    }

    // https://stackoverflow.com/questions/57206717/how-to-use-dbfunction-translation-in-ef-core
    users
        .Where((u) => u.id === 1 && u.name.Contains("X"))
        .OrderBy((u) => u.name)
        .Select(
            (u) =>
                ({
                    name: u.name,
                    id: u.id,
                } as User)
        )
        .ToArray();

    X(1, null);
    let r = props.x && props.z;
    let my: XYZ.MyComponentProps = { name: "a" };
    let other: OtherComponentProps = { name: "b" };
    Test({ x: false, y: 34 });

    return (
        <div>
            {props.x && props.z}
            {props.y > 1 || props.children}
            {props.a?.Select((a) => (
                <p>{a}</p>
            ))}
            <XYZ.MyComponent name="a" />
            <OtherComponent name="b" />
        </div>
    );
}

//     // deferred context
//     var x = (JsxElement)(b => b.Append("<div>").Append("hi").Append("</div>"));
//
//     // deferred context
//     return b => b.Append("<div>")
//         // immediate context
//         .Append(props.z)
//         .Append(x)
//         .Append("Kinder: ")
//         .Append(props.children)
//         .Append(props.a.Select(n =>
//             b.Append("<p>")
//                 .Append(n)
//                 .Append("</p>")
//         ))
//         .Append("</div>");

export function Test(props: TestProps): JsxElement {
    const r = <div>hi!</div>;

    return (
        <div id="avatar" className="pt-6 pl-3" data-x={'er \tsagt "hallo"!'} data-id={1} data-y>
            Herzlich Willkommen wef, {props.z}!<p>Test</p> " \<>Hallo</>
            {}
            <Other
                x={false}
                y={0}
                z={
                    <div>
                        <p>Test</p>
                    </div>
                }
            >
                Ein Test
                {r}
                {props.x || <Other x={false} y={1} z={1}></Other>}
            </Other>
        </div>
    );
}

export function UserAvatar(props: UserAvatarProps): JsxElement | null {
    if (props.status === "loggedOut") {
        return null;
    }
    let b = props.image == "abc";
    let c = false;
    if (!props.image || (!b && !c)) {
    } else if ((props.infos?.Length ?? 0) > 3) {
    } else {
    }

    const x = 1;

    let z = 3;
    //  const data = await load(props.userId);

    if (props.image) z = 9;
    else z += 1;

    ++z;
    z++;

    const o = <Other x y={1} z={<></>} />;

    return (
        <>
            <Test x y={3} z={<a href="google">Google</a>}>
                <div id="1" className="red rounded" />
            </Test>
            <p>
                {" "}
                ID: {props.userId} wie geht es dir {} "Ha\tllo" {'\t\n\\"'}
            </p>
            {props.name && props.image && <p>{props.name}</p>}
            <img src={props.image ?? "unknown.gif"} />
            {x}
            {o}
            <button type="submit"></button>
        </>
    );
}
