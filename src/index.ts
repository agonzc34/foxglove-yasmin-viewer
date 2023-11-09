import { ExtensionContext } from "@foxglove/studio";
import { initYasminViewer } from "./components/Viewer";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({ name: "yasmin-viewer", initPanel: initYasminViewer });
}