export type DocumentProps = {
    readonly title: string;
    readonly children: JsxNode;
};

export function Document(props: DocumentProps): JsxElement {
    return (
        <html lang="de">
            <head>
                <meta charSet="utf-8" />
                <title>{props.title}</title>
            </head>
            <body>{props.children}</body>
        </html>
    );
}
