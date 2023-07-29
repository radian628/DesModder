var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
// eslint-disable-next-line rulesdir/no-reach-past-exports
import * as collabAPI from "../../api.js";
import bodyParser from "body-parser";
import express from "express";
import expressWs from "express-ws";
import * as uuid from "uuid";
var app2 = express();
var app = expressWs(app2).app;
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
});
app.use(bodyParser.json());
var sessions = new Map();
app.post("/", function (req, res) {
    var pathname = req.url;
    if (pathname === "/") {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        var msgJSON = req.body;
        var parsed = collabAPI.CollaborativeEditingMessageToServerParser.safeParse(msgJSON);
        if (!parsed.success) {
            res.status(400).end("");
            return;
        }
        var requestData = parsed.data;
        if (requestData.type === "Host") {
            var sessionID = uuid.v4();
            sessions.set(sessionID, {
                id: sessionID,
                password: requestData.password,
                hostKey: requestData.hostKey,
                connections: [],
            });
            res.end(JSON.stringify({
                type: "HostReply",
                link: "ws://localhost:8080/".concat(sessionID),
            }));
            return;
        }
    }
    res.status(400).end("");
});
function broadcast(sender, session, message) {
    for (var _i = 0, _a = session.connections; _i < _a.length; _i++) {
        var ws = _a[_i];
        if (ws !== sender) {
            ws.send(message);
        }
    }
}
app.ws("/:id", function (ws, req) {
    var id = req.url.split("/")[1];
    var session = sessions.get(id);
    if (!session)
        return;
    session.connections.push(ws);
    ws.on("message", function (msg) {
        var json = JSON.parse(msg.slice(0).toString());
        var maybeParsedMessage = collabAPI.CollaborativeEditingSessionMessageToServerParser.safeParse(json);
        if (!maybeParsedMessage.success)
            return;
        var parsedMessage = maybeParsedMessage.data;
        switch (parsedMessage.type) {
            case "Close":
                if (parsedMessage.key !== session.hostKey)
                    break;
                broadcast(ws, session, JSON.stringify(__assign(__assign({}, parsedMessage), { key: undefined })));
                break;
            case "FullState":
            case "PartialState":
                broadcast(ws, session, JSON.stringify(parsedMessage));
                break;
        }
    });
});
app.listen(8080);
