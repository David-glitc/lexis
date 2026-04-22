import { app } from "../../../../server/hono/app";

export const runtime = "nodejs";

async function handle(request: Request): Promise<Response> {
  return app.fetch(request);
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as OPTIONS };
