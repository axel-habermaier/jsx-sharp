export type OtherComponentProps = {
    readonly name: string;
};

export function OtherComponent(props: OtherComponentProps): JsxElement {
    return <p>OtherComponent {props.name}</p>;
}
