# Dae Application Environment

This is meant to be a browser-based reference implementation of an environment
for distributing applications.
This environment has the following key priorities:

- High security
- Rich capabilities
- Application focused
- Easily adoptable
- Low resource requirements

Key mechanisms to accomplish the goals:

- High security: By default, no outward network communication at all.
  There likely will be a means to trust apps, but it needs to be clear.
  Hand-typed and/or manually reviewed messages and URLs might be allowed, too.
- Rich capabilities: WebGL, WebAssembly, local file storage sandbox, rich text
  camera/mic access, local file system read access, inbound network
  notifications.
  - These are safe because apps can't write outside the sandbox nor to the
    network.
- Application focused: Download whole apps at once rather than web-based.
- Easily adoptable: Use standards (WebGL, Wasm, ...) where applicable.
  Reference implementation possible in web browsers.
- Low resource requirements: Implementation should be possible without a full
  browser runtime.
  This means likely only a subset of HTML/CSS will be available.
  No JavaScript.

I actually like JS, but runtime requirements go down without JS, and Wasm is
easy to sandbox in browsers today (prohibit outbound net access) for security.


## Baby steps

I need to figure out how to build Wasm code that calls browser features to
implement a baseline API.

Hello world to the console is a good start.


## Outbound messages

Manual message review is faulty, because a malicious app could hide information
in a message or URL that otherwise seems safe.
This is possible even without Unicode uncertainty and so on.

Or say there's a way to send photos or videos directly from a guaranteed
unfiltered stream (boring!), you could even encode information of the timing in
which messages are sent.

Still, some mechanism for reviewing URLs and messages in a standard fashion will
likely help for security in a partially trusted app.

Messages typed without data from the application itself or sent from a
controlled message sender are likely safe ...

Is data taint tracking work anything?
