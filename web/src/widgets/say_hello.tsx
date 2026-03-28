import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

function HelloWorld() {
  const { input, output } = useToolInfo<"say_hello">();

  return (
    <div className="container">
      <div className="card">
        {output ? (
          <>
            <div className="greeting">{output.greeting}</div>
            <div className="subtext">Powered by Skybridge MCP</div>
          </>
        ) : (
          <div className="greeting">Hello, {input?.name ?? "there"}!</div>
        )}
      </div>
    </div>
  );
}

export default HelloWorld;

mountWidget(<HelloWorld />);
