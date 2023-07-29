import { createServer } from "http";
import { WebSocketServer } from "ws";
var server = createServer();
server.on("upgrade", function (req, socket, head) {
    var pathname = req.url;
    wss.handleUpgrade(req, socket, head, function (ws) {
        if (pathname === "/") {
            console.log("connection created from root");
        }
        else {
            console.log("connection created from subdir", pathname);
        }
        ws.on("message", function (msg) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                var msgJSON = JSON.parse(msg.slice(0).toString());
            }
            catch (_a) { }
        });
    });
});
var wss = new WebSocketServer({
    noServer: true,
});
server.listen(8080);
