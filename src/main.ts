import './em/runtime';

// addEventListener('load', main);

declare let WebAssembly: any;

async function main() {
  let path = 'wasm/hello/hello.wasm';
  // TODO Can't control content type from webpack dev server?
  // let module = await WebAssembly.instantiateStreaming(fetch(path), api);
  let bytes = await (await fetch(path)).arrayBuffer();
  let imports: any = {};
  let api = makeImports(imports);
  let {module, instance} = await WebAssembly.instantiate(bytes, api);
  console.log(module, instance);
  let {exports: {greet, memory}} = instance;
  imports.buffer = memory.buffer;
  greet();
}

function makeImports(imports: any) {
  return {
    global: {},
    env: {
      log(address: number) {
        // console.log(address);
        let bytes = new Uint8Array(imports.buffer).slice(address);
        let size = bytes.indexOf(0);
        bytes = bytes.slice(0, size);
        let string =
          new Array(...bytes).map(byte => String.fromCharCode(byte)).join('');
        let div = document.createElement('div');
        div.innerText = string;
        document.body.appendChild(div);
      },
      // memory: new WebAssembly.Memory({initial: 1}),
    }
  }
}
