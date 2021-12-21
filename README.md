# DesModder

Supercharge your Desmos graph creation and sharing experience with many convenient features:

- Export videos and GIFs of your graphs based on actions or sliders
- Find and replace expressions
- Pin expressions to the top
- Paste ASCIIMath (such as the results of Wolfram Alpha queries) into Desmos
- Duplicate any expression with keybind Ctrl+Q
- Quickly dump a folder's entire contents, and merge expressions into a folder
- Use Shift+Enter to write newlines in notes
- Hide and ignore unwanted slider suggestions
- View tips for lesser-known features of Desmos
- Right-click (instead of long press) expressions to style them
- Adjust settings that can let you hide the keypad, lock the viewport, and more
- Toggle display of expression IDs
- More to come!

All graphs created using this extension are compatible with vanilla Desmos. This means your graphs are always safe to share with others, regardless of whether or not they have DesModder.

Chrome will warn you asking for permission for the declarativeNetRequest API ("Block content on any page you visit"). In this case, the warning is inaccurate because the net request rules apply [only to Desmos](https://github.com/DesModder/DesModder/blob/main/public/net_request_rules.json#L21) and simply modify response headers to provide permissions that enable in-browser video export. This extension follows Chrome's best practices and is open source (https://github.com/DesModder/DesModder), so you and others can contribute and see what goes on in the background.

Keep in mind that many features of this extension rely on unofficial, undocumented, or unstable parts of Desmos. When something stops working, report it on http://github.com/DesModder/DesModder/issues with a description of the issue.

Currently only works on the public-facing calculator at https://desmos.com/calculator.

Changelog: https://github.com/DesModder/DesModder/blob/main/docs/CHANGELOG.md.

Not affiliated with Desmos.
