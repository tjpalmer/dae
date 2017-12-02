import {Descriptor, Grit} from '../src/';
import {readFileSync} from 'fs';
import {argv} from 'process';

function parseEmJs(js: string): Descriptor {
  // Metadata storage.
  let grit: Grit = {
    staticBump: NaN,
    tableSize: NaN,
  };
  let descriptor: Descriptor = {
    grit,
    main: '',
    title: '',
  };
  // Prep handlers.
  interface Handler {
    pattern: RegExp;
    process: (match: RegExpMatchArray) => void;
  };
  let handlers: Handler[] = [
    {
      pattern: /var wasmBinaryFile = .*'((.*).wasm)';/,
      process(match) {
        descriptor.main = match[1];
        descriptor.title = match[2];
      },
    },
    {
      pattern: /__ATINIT__\.push\((.*)\);/,
      process(match) {
        let items = match[1].split(',');
        items = items.filter(item => item.trim());
        if (items.length) {
          grit.atInits = items.map((item) => {
            return item.match(/function\(\) \{ (\w+)\(\) }/)![1];
          });
        }
      },
    },
    {
      pattern: /var STATIC_BUMP = (\d+);/,
      process(match) {
        grit.staticBump = Number(match[1]);
      },
    },
    {
      // For, presume wasmTableSize and wasmMaxTableSize are the same.
      pattern: /Module\['wasmMaxTableSize'] = (\d+);/,
      process(match) {
        grit.tableSize = Number(match[1]);
      },
    }
  ];
  // Parse.
  let lines = js.split('\n');
  for (let line of lines) {
    handlers.some((handler, index) => {
      let match = line.match(handler.pattern);
      if (match) {
        handler.process(match);
        // No need to keep this handler around anymore.
        // TODO Could make keys on handlers to remove all matching keys if we
        // TODO need different handlers for different versions of output.
        handlers.splice(index, 1);
        return true;
      }
      return false;
    });
    if (!handlers.length) {
      // Got everything we needed.
      break;
    }
  }
  // All done.
  return descriptor;
}

function main() {
  let jsName = argv[2];
  let js = readFileSync(jsName).toString();
  let descriptor = parseEmJs(js);
  let json = JSON.stringify(descriptor);
  console.log(descriptor);
  console.log(json);
}

main();
