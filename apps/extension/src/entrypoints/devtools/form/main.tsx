import { DevToolsFormPage } from "@viewportvr/pages/devtools/form";
import ReactDOM from "react-dom/client";

export const DevToolsFormUI = () => {
    return (
        <DevToolsFormPage />
    )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<DevToolsFormUI />);
