import { Guid, int, JsxElement, JsxNode } from "./Types";

//declare function load(userId: Guid): Promise<Status>;

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
    readonly z: JsxNode;
    readonly a?: int[];
    readonly children?: JsxNode;
};

function X(a: int | null, b: (string | null)[]): (string | null)[] | null {
    return null;
}

function Other(props: TestProps): JsxElement {
    return (
        <div>
            {props.x && props.z}
            {props.y > 1 || props.children}
        </div>
    );
}

function Test(props: TestProps): JsxElement {
    const r = <div>hi!</div>;

    return (
        <div id="avatar" className="pt-6 pl-3">
            Herzlich Willkommen, {props.z}!
            <Other
                x
                y={3}
                z={
                    <div>
                        <p>Test</p>
                    </div>
                }
            >
                Ein Test
                {r}
                <Other x={false} y={1} z={1}></Other>
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
    } else if ((props.infos?.length ?? 0) > 3) {
    } else {
    }

    const x = 1;
    const y = 2;

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
            {props.name && <p>{props.name}</p>}
            <img src={props.image ?? "unknown.gif"} />
            {x}
            {o}
            <button type="submit"></button>
        </>
    );
}
