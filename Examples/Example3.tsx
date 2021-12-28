import { MyComponent } from "./Example2";

export type OtherComponentProps = {
    readonly name: string;
};

export function OtherComponent(props: OtherComponentProps): JsxElement {
    return <p>OtherComponent {props.name}</p>;
}

export function AboutPage(app: WebApplication): void {
    app.MapGet("/about", (name: string, env: IWebHostEnvironment) => {
        return Jsx(
            <>
                <MyComponent name={name + env.EnvironmentName} />
                <MyComponent name={env.EnvironmentName} />
                <MyComponent name={name} />
            </>
        );
    });
}
