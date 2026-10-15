import { app } from "./app";
import { port } from "./lib/env";

app.listen(port, () => {
  console.info(`API server listening on port ${port}`);
});
