import {Descriptor, Grit} from '../src/';
import {readFileSync} from 'fs';
import {argv} from 'process';

function parseEmJs(js: string): Descriptor {
  // console.log(js.length);
  let grit = {
    staticSize: 0,
    tableSize: 0,
  };
  let descriptor = {
    grit,
    main: 'whatever.wasm',
    title: 'App',
  };
  let lines = js.split('\n');
  for (let line of lines) {
    // TODO wasmBinaryFile
    let match = line.match(/var wasmBinaryFile = .*'((.*).wasm)';/);
    if (match) {
      descriptor.main = match[1];
      descriptor.title = match[2];
    }
  }
  return descriptor;
}

function main() {
  let jsName = argv[2];
  let js = readFileSync(jsName).toString();
  let descriptor = parseEmJs(js);
  console.log(descriptor);
}

main();
