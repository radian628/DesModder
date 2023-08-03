// eslint-disable-next-line rulesdir/no-reach-past-exports
import * as collabAPI from "../../src/plugins/collaborative-editing/api.js";
// eslint-disable-next-line rulesdir/no-reach-past-exports
import { GraphState } from "../../src/plugins/collaborative-editing/graphstate.js";
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

function applyItemStateDiff(
  items: collabAPI.FutureProofItemState[],
  diff: collabAPI.GraphStateChange[]
) {
  for (const diffItem of diff) {
    const idToIndexMap = new Map(items.map((e, i) => [e.id, i]));

    if (diffItem.type === "AddItem") {
      let index: number | undefined;
      let indexIntoOrder = diffItem.after;

      while (index === undefined) {
        if (indexIntoOrder === undefined || indexIntoOrder < 0) {
          index = -1;
          break;
        }
        index = idToIndexMap.get(diffItem.order[indexIntoOrder]);
        indexIntoOrder--;
      }

      items.splice(index + 1, 0, diffItem.state);
    } else if (diffItem.type === "RemoveItem") {
      const idx = idToIndexMap.get(diffItem.id);

      if (idx === undefined) continue;

      items.splice(idx, 1);
    }
  }

  // deduplicate expressions (this may be the source of the bug)
  const idSet = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const id = items[i].id;
    if (idSet.has(id)) {
      items.splice(i, 1);
      i--;
    }
    idSet.add(id);
  }
}

interface CollabConnection {
  ws: WebSocket;
  displayName?: string;
  lastUpdateTime: number;
  alive: boolean;
}

interface CollabSession {
  connections: Map<WebSocket, CollabConnection>;
  password?: string;
  hostKey: string;
  id: string;
  graphState: collabAPI.FutureProofGraphState;
  lastUpdateTime: number;
  areAllClientsUpToDate: boolean;
}

const sessions = new Map<string, CollabSession>();

const DELETE_SESSION_DELAY = 1000 * 60 * 60;

setInterval(() => {
  const now = Date.now();
  const sessionsToRemove: string[] = [];

  for (const [str, session] of sessions) {
    if (now - session.lastUpdateTime >= DELETE_SESSION_DELAY) {
      sessionsToRemove.push(str);
    }
  }

  for (const s of sessionsToRemove) {
    sessions.delete(s);
  }
}, DELETE_SESSION_DELAY);

const PINGPONG_DELAY = 30000;

setInterval(() => {
  for (const [str, session] of sessions) {
    for (const [ws, conn] of session.connections) {
      if (!conn.alive) {
        session.connections.delete(ws);
      }
      conn.alive = false;
      ws.ping();
    }
  }
}, PINGPONG_DELAY);

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
      const session = {
        areAllClientsUpToDate: false,
        id: sessionID,
        password: requestData.password,
        hostKey: requestData.hostKey,
        connections: new Map(),
        lastUpdateTime: Date.now(),
        graphState: {
          version: 9,
          randomSeed: "25979e70e755924a9ac9f841c0482662",
          graph: {
            viewport: {
              xmin: -10,
              ymin: -9.541062801932368,
              xmax: 10,
              ymax: 9.541062801932368,
            },
          },
          expressions: {
            list: [
              {
                type: "expression",
                id: "1",
                color: "#c74440",
              },
            ],
          },
        },
      };

      setInterval(() => {
        if (!session.areAllClientsUpToDate) {
          broadcast(
            undefined,
            session,
            JSON.stringify({
              type: "FullState",
              state: session.graphState,
              timestamp: Date.now(),
            })
          );
          session.areAllClientsUpToDate = true;
        }
      }, 250);

      sessions.set(sessionID, session);
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

function broadcast(
  sender: WebSocket | undefined,
  session: CollabSession,
  message: string
) {
  for (const { ws } of session.connections.values()) {
    if (ws !== sender) {
      ws.send(message);
    }
  }
}

app.ws("/:id", (ws, req) => {
  const id = req.url.split("/")[1];
  const session = sessions.get(id);
  if (!session) return;

  const conn: CollabConnection = {
    ws,
    lastUpdateTime: Date.now(),
    alive: true,
  };

  session.connections.set(ws, conn);

  if (session.graphState) {
    ws.send(
      JSON.stringify({
        type: "FullState",
        state: session.graphState,
        timestamp: Date.now(),
      })
    );
  }

  ws.on("pong", () => {
    conn.alive = true;
  });

  ws.on("message", (msg) => {
    conn.alive = true;
    session.lastUpdateTime = Date.now();
    const json = JSON.parse(msg.slice(0).toString());
    const maybeParsedMessage =
      collabAPI.CollaborativeEditingSessionMessageToServerParser.safeParse(
        json
      );

    console.log("maybeparsedmessage", maybeParsedMessage);

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
        session.graphState =
          parsedMessage.state as unknown as collabAPI.FutureProofGraphState;
        broadcast(ws, session, JSON.stringify(parsedMessage));
        session.areAllClientsUpToDate = false;
        break;
      case "PartialState":
        applyItemStateDiff(
          session.graphState.expressions.list,
          parsedMessage.items
        );
        session.areAllClientsUpToDate = false;
        break;
      case "Join":
        session.connections.get(ws).displayName = parsedMessage.displayName;
        broadcast(
          undefined,
          session,
          JSON.stringify({
            type: "SessionInfo",
            usersOnline: Array.from(session.connections.values()).map(
              (conn) => conn.displayName
            ),
          })
        );
        session.areAllClientsUpToDate = false;
        break;
    }
  });
});

app.listen(8080);
