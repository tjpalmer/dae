# Dae Application Environment

## Demos

These two emsdk-compiled demos run from the same constrained js environment.
Only a small json descriptor and the wasm module itself is different:

- C++ Hello World: https://tjpalmer.github.io/dae/#hello
  - [Source](https://github.com/tjpalmer/dae/blob/master/wasm/hello/hello.cpp)
  - [Descriptor](
      https://github.com/tjpalmer/dae/blob/master/wasm/hello/dae.json
    )
  - [All files](https://github.com/tjpalmer/dae/tree/master/wasm/hello)
- C Triangle GL: https://tjpalmer.github.io/dae/#gl
  - From Emscripten demos from OpenGL ES 2.0 Programming Guide
  - [Source](
      https://github.com/tjpalmer/dae/blob/master/wasm/gl/Hello_Triangle.c
    )
  - [Descriptor](https://github.com/tjpalmer/dae/blob/master/wasm/gl/dae.json)
  - [All files](https://github.com/tjpalmer/dae/tree/master/wasm/gl)

For now, I haven't worked on the style or layout (or lots more).
These currently are just a proof of concept.

More intro below.


## Overview

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

Also, while the GL demo uses ES 2.0, I'll probably require WebGL2/ES3 in the
future.
Browsers that can't cope, can't cope.


## Implementation strategy

Emscripten has a lot of the functionality I need, but it also wants to include
things I don't.
I also want output in a constant form, not post-spliced.

I'm currently modifying emscripten js output, but it might be better to fork
emscripten to generate the modules directly that I need.


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
Some issues with emsdk so far include:

- Larger files
- Symbols prefixed with underscore
- Various low-level details that I extract from compiled js into descriptor
  files

I'm also still learning what is wasm and what is emscripten.

Here are some command lines for emscripten (and --emit-symbol-map doesn't seem
to emit what I want):

```
emcc --std=c++14 -s WASM=1 hello.cpp -o hello.html -g
emcc -s WASM=1 -s SIDE_MODULE=1 hello.cpp -o hello.wasm -g
emrun --no_browser --port 8080 .
```

Anyway, here are some references for wasm, emsdk, and llvm:

- https://github.com/WebAssembly/design/issues/1046
- https://github.com/kripken/emscripten/wiki/WebAssembly
- https://github.com/kripken/emscripten/issues/5384
- https://github.com/wasdk/wasmexplorer-service/blob/master/scripts/compile.sh
- http://blog.golovin.in/how-to-start-using-webassembly-today/
- https://stackoverflow.com/questions/45146099/how-do-i-compile-a-c-file-to-webassembly
- https://gist.github.com/yurydelendik/4eeff8248aeb14ce763e
- https://github.com/WebAssembly/wasm-jit-prototype
