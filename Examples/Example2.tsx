export type MyComponentProps = {
    readonly name: string;
};

export function MyComponent(props: MyComponentProps): JsxElement {
    return <p>MyComponent {props.name}</p>;
}
