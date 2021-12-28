import * as React from "react";

declare global {
    namespace JSX {
        interface IntrinsicElements {
            "turbo-frame": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}
