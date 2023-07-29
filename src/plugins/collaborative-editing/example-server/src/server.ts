// eslint-disable-next-line rulesdir/no-reach-past-exports
import * as collabAPI from "../../api.js";
import bodyParser from "body-parser";
import express from "express";
import expressWs from "express-ws";
import * as uuid from "uuid";
import { WebSocket } from "ws";

const app2 = express();

const app = expressWs(app2).app;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(bodyParser.json());

interface CollabSession {
  connections: WebSocket[];
  password?: string;
  hostKey: string;
  id: string;
}

const sessions = new Map<string, CollabSession>();

app.post("/", (req, res) => {
  const pathname = req.url;

  if (pathname === "/") {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const msgJSON = req.body;
    const parsed =
      collabAPI.CollaborativeEditingMessageToServerParser.safeParse(msgJSON);
    if (!parsed.success) {
      res.status(400).end("");
      return;
    }

    const requestData = parsed.data;

    if (requestData.type === "Host") {
      const sessionID = uuid.v4();
      sessions.set(sessionID, {
        id: sessionID,
        password: requestData.password,
        hostKey: requestData.hostKey,
        connections: [],
      });
      res.end(
        JSON.stringify({
          type: "HostReply",
          link: `ws://localhost:8080/${sessionID}`,
        })
      );
      return;
    }
  }

  res.status(400).end("");
});

function broadcast(sender: WebSocket, session: CollabSession, message: string) {
  for (const ws of session.connections) {
    if (ws !== sender) {
      ws.send(message);
    }
  }
}

app.ws("/:id", (ws, req) => {
  const id = req.url.split("/")[1];
  const session = sessions.get(id);
  if (!session) return;

  session.connections.push(ws);

  ws.on("message", (msg) => {
    const json = JSON.parse(msg.slice(0).toString());
    const maybeParsedMessage =
      collabAPI.CollaborativeEditingSessionMessageToServerParser.safeParse(
        json
      );
    if (!maybeParsedMessage.success) return;

    const parsedMessage = maybeParsedMessage.data;
    switch (parsedMessage.type) {
      case "Close":
        if (parsedMessage.key !== session.hostKey) break;
        broadcast(
          ws,
          session,
          JSON.stringify({
            ...parsedMessage,
            key: undefined,
          })
        );
        break;
      case "FullState":
      case "PartialState":
        broadcast(ws, session, JSON.stringify(parsedMessage));
        break;
    }
  });
});

app.listen(8080);
