import {Descriptor} from './';
import {runModule} from './em/runtime';

addEventListener('load', main);

async function main() {
  var statusElement = document.getElementById('status')!;
  var progressElement =
    document.getElementById('progress') as HTMLProgressElement;
  var spinnerElement = document.getElementById('spinner')!;

  var Module = {
    descriptor: undefined as (Descriptor | undefined),
    preRun: [],
    postRun: [],
    print: (function() {
      var element = document.getElementById('output') as HTMLTextAreaElement;
      if (element) element.value = ''; // clear browser cache
      return function(text: string) {
        if (arguments.length > 1) {
          text = Array.prototype.slice.call(arguments).join(' ');
        }
        // These replacements are necessary if you render to raw HTML
        //text = text.replace(/&/g, "&amp;");
        //text = text.replace(/</g, "&lt;");
        //text = text.replace(/>/g, "&gt;");
        //text = text.replace('\n', '<br>', 'g');
        console.log(text);
        if (element) {
          element.value += text + "\n";
          element.scrollTop = element.scrollHeight; // focus on bottom
        }
      };
    })(),
    printErr: function(text: string) {
      if (arguments.length > 1) {
        text = Array.prototype.slice.call(arguments).join(' ');
      }
      console.log(text);
    },
    canvas: (function() {
      var canvas = document.getElementById('canvas')!;

      // As a default initial behavior, pop up an alert when webgl context is
      // lost. To make your application robust, you may want to override this
      // behavior before shipping!
      // See http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.15.2
      canvas.addEventListener(
        "webglcontextlost",
        function(e) {
          alert('WebGL context lost. You will need to reload the page.');
          e.preventDefault();
        },
        false,
      );

      return canvas;
    })(),
    setStatus: function(text: string) {
      var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
      var now = Date.now();
      if (m && now - Date.now() < 30) {
        // if this is a progress update, skip it if too soon
        return;
      }
      if (m) {
        text = m[1];
        progressElement.value = parseInt(m[2])*100;
        progressElement.max = parseInt(m[4])*100;
        progressElement.hidden = false;
        spinnerElement.hidden = false;
      } else {
        progressElement.removeAttribute('value');
        progressElement.hidden = true;
        if (!text) spinnerElement.style.display = 'none';
      }
      statusElement.innerHTML = text;
    },
    totalDependencies: 0,
    monitorRunDependencies: function(left: number) {
      this.totalDependencies = Math.max(this.totalDependencies, left);
      Module.setStatus(
        left ?
          'Preparing... (' +
            (this.totalDependencies-left) + '/' + this.totalDependencies + ')' :
            'All downloads complete.'
      );
    },
    wasmBinaryFile: '',
  };
  Module.setStatus('Downloading...');
  window.onerror = function(event) {
    // TODO do not warn on ok events like simulating an infinite loop or
    // TODO exitStatus
    Module.setStatus('Exception thrown, see JavaScript console');
    spinnerElement.style.display = 'none';
    Module.setStatus = function(text) {
      if (text) Module.printErr('[post-exception status] ' + text);
    };
  };

  let appName = window.location.hash.replace('#', '') || 'hello';
  let uri = `wasm/${appName}/dae.json`;
  let descriptor = await (await fetch(uri)).json() as Descriptor;
  Module.descriptor = descriptor;
  // TODO Better relative pathing.
  Module.wasmBinaryFile = uri.replace(/[^/]+$/, descriptor.main);
  runModule(Module);
}
