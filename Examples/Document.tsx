export type DocumentProps = {
    readonly title: string;
    readonly children: JsxNode;
};

export function Document(props: DocumentProps): JsxElement {
    return (
        <html lang="de">
            <head>
                <meta charSet="utf-8" />
                {/* We disable the turbo cache, has it has some strange feel to it */}
                <meta name="turbo-cache-control" content="no-cache" />
                <script
                    src="https://cdn.skypack.dev/pin/@hotwired/turbo@v7.1.0-TUqC3yaXitp7AydOh3hN/mode=imports,min/optimized/@hotwired/turbo.js"
                    type="module"
                ></script>
                <title>{props.title}</title>
            </head>
            <body>{props.children}</body>
        </html>
    );
}
