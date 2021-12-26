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
    readonly children: JsxNode;
};

function X(a: int | null, b: (string | null)[]): (string | null)[] | null {
    return null;
}

function Test(props: TestProps): JsxElement {
    return null;
}

export function UserAvatar(props: UserAvatarProps): JsxElement {
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

    return (
        <>
            <Test x y={3}>
                <div />
            </Test>
            <p> ID: {props.userId} wie geht es dir </p>
            {props.name && <p>{props.name}</p>}
            <img src={props.image ?? "unknown.gif"} />
            {x}
            <button type="submit"></button>
        </>
    );
}
