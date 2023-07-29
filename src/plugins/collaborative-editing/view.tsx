import CollaborativeEditing from ".";
import { Component, jsx } from "DCGView";
import { For, If, IfElse } from "components";

export default class View extends Component<{ plugin: CollaborativeEditing }> {
  template() {
    return (
      <div class="dcg-popover-interior">
        <button
          onClick={async () => {
            const result = await (
              await fetch(this.props.plugin().settings.hostLink, {
                body: JSON.stringify({
                  type: "Host",
                  hostKey: "your mom lol",
                }),
                headers: { "Content-Type": "application/json" },
                method: "POST",
              })
            ).json();

            if (result.link) {
              window.location.search = `?collab=${encodeURIComponent(
                result.link
              )}`;
            }
          }}
        >
          Host
        </button>
        <For
          each={() => this.props.plugin().sessionInfo?.usersOnline ?? []}
          key={Math.random}
        >
          <ul>{(u: string) => <li>{u}</li>}</ul>
        </For>
      </div>
    );
  }
}
