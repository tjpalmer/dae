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

I've got something that can run wasm and receive a call in js now.


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


## Various references

I think I want llvm rather than emscripten for small output and such.
But I've got emscripten working so far, or else I've used online llvm-based
tools.
I'll need to build llvm and other tools manually perhaps if I want to use wasm
there perhaps.
Two issues with emsdk so far include:

- Larger files
- Symbols prefixed with underscore

Here are some command lines for emscripten (and --emit-symbol-map doesn't seem
to emit what I want):

```
emcc -s WASM=1 hello.cpp -o hello.html -g
emcc -s WASM=1 -s SIDE_MODULE=1 hello.cpp -o hello.wasm -g
emrun --no_browser --port 8080 .
```

Anyway, here are some references for both emsdk and llvm:

- https://github.com/kripken/emscripten/wiki/WebAssembly
- https://github.com/kripken/emscripten/issues/5384
- https://github.com/wasdk/wasmexplorer-service/blob/master/scripts/compile.sh
- http://blog.golovin.in/how-to-start-using-webassembly-today/
- https://stackoverflow.com/questions/45146099/how-do-i-compile-a-c-file-to-webassembly
- https://gist.github.com/yurydelendik/4eeff8248aeb14ce763e
- https://github.com/WebAssembly/wasm-jit-prototype
