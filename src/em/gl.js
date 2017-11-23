export function defineGl(Module) {

var HEAP8 = Module['HEAP8'];
var HEAP16 = Module['HEAP16'];
var HEAP32 = Module['HEAP32'];
var HEAPU8 = Module['HEAPU8'];
var HEAPU16 = Module['HEAPU16'];
var HEAPU32 = Module['HEAPU32'];
var HEAPF32 = Module['HEAPF32'];
var HEAPF64 = Module['HEAPF64'];
var Pointer_stringify = Module['Pointer_stringify'];

var GL={counter:1,lastError:0,buffers:[],mappedBuffers:{},programs:[],framebuffers:[],renderbuffers:[],textures:[],uniforms:[],shaders:[],vaos:[],contexts:[],currentContext:null,offscreenCanvases:{},timerQueriesEXT:[],byteSizeByTypeRoot:5120,byteSizeByType:[1,1,2,2,4,4,4,2,3,4,8],programInfos:{},stringCache:{},tempFixedLengthArray:[],packAlignment:4,unpackAlignment:4,init:function () {
  GL.miniTempBuffer = new Float32Array(GL.MINI_TEMP_BUFFER_SIZE);
  for (var i = 0; i < GL.MINI_TEMP_BUFFER_SIZE; i++) {
    GL.miniTempBufferViews[i] = GL.miniTempBuffer.subarray(0, i+1);
  }

  // For functions such as glDrawBuffers, glInvalidateFramebuffer and glInvalidateSubFramebuffer that need to pass a short array to the WebGL API,
  // create a set of short fixed-length arrays to avoid having to generate any garbage when calling those functions.
  for (var i = 0; i < 32; i++) {
    GL.tempFixedLengthArray.push(new Array(i));
  }
},recordError:function recordError(errorCode) {
  if (!GL.lastError) {
    GL.lastError = errorCode;
  }
},getNewId:function (table) {
  var ret = GL.counter++;
  for (var i = table.length; i < ret; i++) {
    table[i] = null;
  }
  return ret;
},MINI_TEMP_BUFFER_SIZE:256,miniTempBuffer:null,miniTempBufferViews:[0],getSource:function (shader, count, string, length) {
  var source = '';
  for (var i = 0; i < count; ++i) {
    var frag;
    if (length) {
      var len = HEAP32[(((length)+(i*4))>>2)];
      if (len < 0) {
        frag = Pointer_stringify(HEAP32[(((string)+(i*4))>>2)]);
      } else {
        frag = Pointer_stringify(HEAP32[(((string)+(i*4))>>2)], len);
      }
    } else {
      frag = Pointer_stringify(HEAP32[(((string)+(i*4))>>2)]);
    }
    source += frag;
  }
  return source;
},createContext:function (canvas, webGLContextAttributes) {
  if (typeof webGLContextAttributes['majorVersion'] === 'undefined' && typeof webGLContextAttributes['minorVersion'] === 'undefined') {
    webGLContextAttributes['majorVersion'] = 1;
    webGLContextAttributes['minorVersion'] = 0;
  }


  var ctx;
  var errorInfo = '?';
  function onContextCreationError(event) {
    errorInfo = event.statusMessage || errorInfo;
  }
  try {
    canvas.addEventListener('webglcontextcreationerror', onContextCreationError, false);
    try {
      if (webGLContextAttributes['majorVersion'] == 1 && webGLContextAttributes['minorVersion'] == 0) {
        ctx = canvas.getContext("webgl", webGLContextAttributes) || canvas.getContext("experimental-webgl", webGLContextAttributes);
      } else if (webGLContextAttributes['majorVersion'] == 2 && webGLContextAttributes['minorVersion'] == 0) {
        ctx = canvas.getContext("webgl2", webGLContextAttributes);
      } else {
        throw 'Unsupported WebGL context version ' + majorVersion + '.' + minorVersion + '!'
      }
    } finally {
      canvas.removeEventListener('webglcontextcreationerror', onContextCreationError, false);
    }
    if (!ctx) throw ':(';
  } catch (e) {
    Module.print('Could not create canvas: ' + [errorInfo, e, JSON.stringify(webGLContextAttributes)]);
    return 0;
  }
  // possible GL_DEBUG entry point: ctx = wrapDebugGL(ctx);

  if (!ctx) return 0;
  return GL.registerContext(ctx, webGLContextAttributes);
},registerContext:function (ctx, webGLContextAttributes) {
  var handle = GL.getNewId(GL.contexts);
  var context = {
    handle: handle,
    attributes: webGLContextAttributes,
    version: webGLContextAttributes['majorVersion'],
    GLctx: ctx
  };


  // Store the created context object so that we can access the context given a canvas without having to pass the parameters again.
  if (ctx.canvas) ctx.canvas.GLctxObject = context;
  GL.contexts[handle] = context;
  if (typeof webGLContextAttributes['enableExtensionsByDefault'] === 'undefined' || webGLContextAttributes['enableExtensionsByDefault']) {
    GL.initExtensions(context);
  }
  return handle;
},makeContextCurrent:function (contextHandle) {
  var context = GL.contexts[contextHandle];
  if (!context) return false;
  GLctx = Module.ctx = context.GLctx; // Active WebGL context object.
  GL.currentContext = context; // Active Emscripten GL layer context object.
  return true;
},getContext:function (contextHandle) {
  return GL.contexts[contextHandle];
},deleteContext:function (contextHandle) {
  if (GL.currentContext === GL.contexts[contextHandle]) GL.currentContext = null;
  if (typeof JSEvents === 'object') JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas); // Release all JS event handlers on the DOM element that the GL context is associated with since the context is now deleted.
  if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas) GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined; // Make sure the canvas object no longer refers to the context object so there are no GC surprises.
  GL.contexts[contextHandle] = null;
},initExtensions:function (context) {
  // If this function is called without a specific context object, init the extensions of the currently active context.
  if (!context) context = GL.currentContext;

  if (context.initExtensionsDone) return;
  context.initExtensionsDone = true;

  var GLctx = context.GLctx;

  context.maxVertexAttribs = GLctx.getParameter(GLctx.MAX_VERTEX_ATTRIBS);

  // Detect the presence of a few extensions manually, this GL interop layer itself will need to know if they exist. 

  if (context.version < 2) {
    // Extension available from Firefox 26 and Google Chrome 30
    var instancedArraysExt = GLctx.getExtension('ANGLE_instanced_arrays');
    if (instancedArraysExt) {
      GLctx['vertexAttribDivisor'] = function(index, divisor) { instancedArraysExt['vertexAttribDivisorANGLE'](index, divisor); };
      GLctx['drawArraysInstanced'] = function(mode, first, count, primcount) { instancedArraysExt['drawArraysInstancedANGLE'](mode, first, count, primcount); };
      GLctx['drawElementsInstanced'] = function(mode, count, type, indices, primcount) { instancedArraysExt['drawElementsInstancedANGLE'](mode, count, type, indices, primcount); };
    }

    // Extension available from Firefox 25 and WebKit
    var vaoExt = GLctx.getExtension('OES_vertex_array_object');
    if (vaoExt) {
      GLctx['createVertexArray'] = function() { return vaoExt['createVertexArrayOES'](); };
      GLctx['deleteVertexArray'] = function(vao) { vaoExt['deleteVertexArrayOES'](vao); };
      GLctx['bindVertexArray'] = function(vao) { vaoExt['bindVertexArrayOES'](vao); };
      GLctx['isVertexArray'] = function(vao) { return vaoExt['isVertexArrayOES'](vao); };
    }

    var drawBuffersExt = GLctx.getExtension('WEBGL_draw_buffers');
    if (drawBuffersExt) {
      GLctx['drawBuffers'] = function(n, bufs) { drawBuffersExt['drawBuffersWEBGL'](n, bufs); };
    }
  }

  GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query");

  // These are the 'safe' feature-enabling extensions that don't add any performance impact related to e.g. debugging, and
  // should be enabled by default so that client GLES2/GL code will not need to go through extra hoops to get its stuff working.
  // As new extensions are ratified at http://www.khronos.org/registry/webgl/extensions/ , feel free to add your new extensions
  // here, as long as they don't produce a performance impact for users that might not be using those extensions.
  // E.g. debugging-related extensions should probably be off by default.
  var automaticallyEnabledExtensions = [ "OES_texture_float", "OES_texture_half_float", "OES_standard_derivatives",
                                         "OES_vertex_array_object", "WEBGL_compressed_texture_s3tc", "WEBGL_depth_texture",
                                         "OES_element_index_uint", "EXT_texture_filter_anisotropic", "ANGLE_instanced_arrays",
                                         "OES_texture_float_linear", "OES_texture_half_float_linear", "WEBGL_compressed_texture_atc",
                                         "WEBGL_compressed_texture_pvrtc", "EXT_color_buffer_half_float", "WEBGL_color_buffer_float",
                                         "EXT_frag_depth", "EXT_sRGB", "WEBGL_draw_buffers", "WEBGL_shared_resources",
                                         "EXT_shader_texture_lod", "EXT_color_buffer_float"];

  function shouldEnableAutomatically(extension) {
    var ret = false;
    automaticallyEnabledExtensions.forEach(function(include) {
      if (ext.indexOf(include) != -1) {
        ret = true;
      }
    });
    return ret;
  }

  var exts = GLctx.getSupportedExtensions();
  if (exts && exts.length > 0) {
    GLctx.getSupportedExtensions().forEach(function(ext) {
      if (automaticallyEnabledExtensions.indexOf(ext) != -1) {
        GLctx.getExtension(ext); // Calling .getExtension enables that extension permanently, no need to store the return value to be enabled.
      }
    });
  }
},populateUniformTable:function (program) {
  var p = GL.programs[program];
  GL.programInfos[program] = {
    uniforms: {},
    maxUniformLength: 0, // This is eagerly computed below, since we already enumerate all uniforms anyway.
    maxAttributeLength: -1, // This is lazily computed and cached, computed when/if first asked, "-1" meaning not computed yet.
    maxUniformBlockNameLength: -1 // Lazily computed as well
  };

  var ptable = GL.programInfos[program];
  var utable = ptable.uniforms;
  // A program's uniform table maps the string name of an uniform to an integer location of that uniform.
  // The global GL.uniforms map maps integer locations to WebGLUniformLocations.
  var numUniforms = GLctx.getProgramParameter(p, GLctx.ACTIVE_UNIFORMS);
  for (var i = 0; i < numUniforms; ++i) {
    var u = GLctx.getActiveUniform(p, i);

    var name = u.name;
    ptable.maxUniformLength = Math.max(ptable.maxUniformLength, name.length+1);

    // Strip off any trailing array specifier we might have got, e.g. "[0]".
    if (name.indexOf(']', name.length-1) !== -1) {
      var ls = name.lastIndexOf('[');
      name = name.slice(0, ls);
    }

    // Optimize memory usage slightly: If we have an array of uniforms, e.g. 'vec3 colors[3];', then 
    // only store the string 'colors' in utable, and 'colors[0]', 'colors[1]' and 'colors[2]' will be parsed as 'colors'+i.
    // Note that for the GL.uniforms table, we still need to fetch the all WebGLUniformLocations for all the indices.
    var loc = GLctx.getUniformLocation(p, name);
    if (loc != null)
    {
      var id = GL.getNewId(GL.uniforms);
      utable[name] = [u.size, id];
      GL.uniforms[id] = loc;

      for (var j = 1; j < u.size; ++j) {
        var n = name + '['+j+']';
        loc = GLctx.getUniformLocation(p, n);
        id = GL.getNewId(GL.uniforms);

        GL.uniforms[id] = loc;
      }
    }
  }
}};function _glCreateProgram() {
var id = GL.getNewId(GL.programs);
var program = GLctx.createProgram();
program.name = id;
GL.programs[id] = program;
return id;
}

function _glClearColor(x0, x1, x2, x3) { GLctx['clearColor'](x0, x1, x2, x3) }

function _glGetProgramInfoLog(program, maxLength, length, infoLog) {
var log = GLctx.getProgramInfoLog(GL.programs[program]);
if (log === null) log = '(unknown error)';

if (maxLength > 0 && infoLog) {
  var numBytesWrittenExclNull = stringToUTF8(log, infoLog, maxLength);
  if (length) HEAP32[((length)>>2)]=numBytesWrittenExclNull;
} else {
  if (length) HEAP32[((length)>>2)]=0;
}
}

function _XChangeWindowAttributes(){}



function _XMapWindow(){}

function _glUseProgram(program) {
GLctx.useProgram(program ? GL.programs[program] : null);
}

function _glGetProgramiv(program, pname, p) {
if (!p) {
  // GLES2 specification does not specify how to behave if p is a null pointer. Since calling this function does not make sense
  // if p == null, issue a GL error to notify user about it. 
  GL.recordError(0x0501 /* GL_INVALID_VALUE */);
  return;
}

if (program >= GL.counter) {
  GL.recordError(0x0501 /* GL_INVALID_VALUE */);
  return;
}

var ptable = GL.programInfos[program];
if (!ptable) {
  GL.recordError(0x0502 /* GL_INVALID_OPERATION */);
  return;
}

if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
  var log = GLctx.getProgramInfoLog(GL.programs[program]);
  if (log === null) log = '(unknown error)';
  HEAP32[((p)>>2)]=log.length + 1;
} else if (pname == 0x8B87 /* GL_ACTIVE_UNIFORM_MAX_LENGTH */) {
  HEAP32[((p)>>2)]=ptable.maxUniformLength;
} else if (pname == 0x8B8A /* GL_ACTIVE_ATTRIBUTE_MAX_LENGTH */) {
  if (ptable.maxAttributeLength == -1) {
    var program = GL.programs[program];
    var numAttribs = GLctx.getProgramParameter(program, GLctx.ACTIVE_ATTRIBUTES);
    ptable.maxAttributeLength = 0; // Spec says if there are no active attribs, 0 must be returned.
    for (var i = 0; i < numAttribs; ++i) {
      var activeAttrib = GLctx.getActiveAttrib(program, i);
      ptable.maxAttributeLength = Math.max(ptable.maxAttributeLength, activeAttrib.name.length+1);
    }
  }
  HEAP32[((p)>>2)]=ptable.maxAttributeLength;
} else if (pname == 0x8A35 /* GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH */) {
  if (ptable.maxUniformBlockNameLength == -1) {
    var program = GL.programs[program];
    var numBlocks = GLctx.getProgramParameter(program, GLctx.ACTIVE_UNIFORM_BLOCKS);
    ptable.maxUniformBlockNameLength = 0;
    for (var i = 0; i < numBlocks; ++i) {
      var activeBlockName = GLctx.getActiveUniformBlockName(program, i);
      ptable.maxUniformBlockNameLength = Math.max(ptable.maxUniformBlockNameLength, activeBlockName.length+1);
    }
  }
  HEAP32[((p)>>2)]=ptable.maxUniformBlockNameLength;
} else {
  HEAP32[((p)>>2)]=GLctx.getProgramParameter(GL.programs[program], pname);
}
}

function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
}

function _glGetShaderInfoLog(shader, maxLength, length, infoLog) {
var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
if (log === null) log = '(unknown error)';
if (maxLength > 0 && infoLog) {
  var numBytesWrittenExclNull = stringToUTF8(log, infoLog, maxLength);
  if (length) HEAP32[((length)>>2)]=numBytesWrittenExclNull;
} else {
  if (length) HEAP32[((length)>>2)]=0;
}
}

function _abort() {
Module['abort']();
}

function _glLinkProgram(program) {
GLctx.linkProgram(GL.programs[program]);
GL.programInfos[program] = null; // uniforms no longer keep the same names after linking
GL.populateUniformTable(program);
}

function _glShaderSource(shader, count, string, length) {
var source = GL.getSource(shader, count, string, length);


GLctx.shaderSource(GL.shaders[shader], source);
}





function _emscripten_set_main_loop_timing(mode, value) {
Browser.mainLoop.timingMode = mode;
Browser.mainLoop.timingValue = value;

if (!Browser.mainLoop.func) {
  console.error('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
  return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
}

if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
    var timeUntilNextTick = Math.max(0, Browser.mainLoop.tickStartTime + value - _emscripten_get_now())|0;
    setTimeout(Browser.mainLoop.runner, timeUntilNextTick); // doing this each time means that on exception, we stop
  };
  Browser.mainLoop.method = 'timeout';
} else if (mode == 1 /*EM_TIMING_RAF*/) {
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
    Browser.requestAnimationFrame(Browser.mainLoop.runner);
  };
  Browser.mainLoop.method = 'rAF';
} else if (mode == 2 /*EM_TIMING_SETIMMEDIATE*/) {
  if (!window['setImmediate']) {
    // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
    var setImmediates = [];
    var emscriptenMainLoopMessageId = 'setimmediate';
    function Browser_setImmediate_messageHandler(event) {
      if (event.source === window && event.data === emscriptenMainLoopMessageId) {
        event.stopPropagation();
        setImmediates.shift()();
      }
    }
    window.addEventListener("message", Browser_setImmediate_messageHandler, true);
    window['setImmediate'] = function Browser_emulated_setImmediate(func) {
      setImmediates.push(func);
      if (ENVIRONMENT_IS_WORKER) {
        if (Module['setImmediates'] === undefined) Module['setImmediates'] = [];
        Module['setImmediates'].push(func);
        window.postMessage({target: emscriptenMainLoopMessageId}); // In --proxy-to-worker, route the message via proxyClient.js
      } else window.postMessage(emscriptenMainLoopMessageId, "*"); // On the main thread, can just send the message to itself.
    }
  }
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
    window['setImmediate'](Browser.mainLoop.runner);
  };
  Browser.mainLoop.method = 'immediate';
}
return 0;
}

function _emscripten_get_now() { abort() }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
Module['noExitRuntime'] = true;

assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');

Browser.mainLoop.func = func;
Browser.mainLoop.arg = arg;

var browserIterationFunc;
if (typeof arg !== 'undefined') {
  browserIterationFunc = function() {
    Module['dynCall_vi'](func, arg);
  };
} else {
  browserIterationFunc = function() {
    Module['dynCall_v'](func);
  };
}

var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;

Browser.mainLoop.runner = function Browser_mainLoop_runner() {
  if (ABORT) return;
  if (Browser.mainLoop.queue.length > 0) {
    var start = Date.now();
    var blocker = Browser.mainLoop.queue.shift();
    blocker.func(blocker.arg);
    if (Browser.mainLoop.remainingBlockers) {
      var remaining = Browser.mainLoop.remainingBlockers;
      var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
      if (blocker.counted) {
        Browser.mainLoop.remainingBlockers = next;
      } else {
        // not counted, but move the progress along a tiny bit
        next = next + 0.5; // do not steal all the next one's progress
        Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
      }
    }
    console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
    Browser.mainLoop.updateStatus();
    
    // catches pause/resume main loop from blocker execution
    if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
    
    setTimeout(Browser.mainLoop.runner, 0);
    return;
  }

  // catch pauses from non-main loop sources
  if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;

  // Implement very basic swap interval control
  Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
  if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
    // Not the scheduled time to render this frame - skip.
    Browser.mainLoop.scheduler();
    return;
  } else if (Browser.mainLoop.timingMode == 0/*EM_TIMING_SETTIMEOUT*/) {
    Browser.mainLoop.tickStartTime = _emscripten_get_now();
  }

  // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
  // VBO double-buffering and reduce GPU stalls.


  if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
    Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
    Browser.mainLoop.method = ''; // just warn once per call to set main loop
  }

  Browser.mainLoop.runIter(browserIterationFunc);

  checkStackCookie();

  // catch pauses from the main loop itself
  if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;

  // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
  // to queue the newest produced audio samples.
  // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
  //       do not need to be hardcoded into this function, but can be more generic.
  if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();

  Browser.mainLoop.scheduler();
}

if (!noSetTiming) {
  if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
  else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)

  Browser.mainLoop.scheduler();
}

if (simulateInfiniteLoop) {
  throw 'SimulateInfiniteLoop';
}
}var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
    Browser.mainLoop.scheduler = null;
    Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
  },resume:function () {
    Browser.mainLoop.currentlyRunningMainloop++;
    var timingMode = Browser.mainLoop.timingMode;
    var timingValue = Browser.mainLoop.timingValue;
    var func = Browser.mainLoop.func;
    Browser.mainLoop.func = null;
    _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true /* do not set timing and call scheduler, we will do it on the next lines */);
    _emscripten_set_main_loop_timing(timingMode, timingValue);
    Browser.mainLoop.scheduler();
  },updateStatus:function () {
    if (Module['setStatus']) {
      var message = Module['statusMessage'] || 'Please wait...';
      var remaining = Browser.mainLoop.remainingBlockers;
      var expected = Browser.mainLoop.expectedBlockers;
      if (remaining) {
        if (remaining < expected) {
          Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
        } else {
          Module['setStatus'](message);
        }
      } else {
        Module['setStatus']('');
      }
    }
  },runIter:function (func) {
    if (ABORT) return;
    if (Module['preMainLoop']) {
      var preRet = Module['preMainLoop']();
      if (preRet === false) {
        return; // |return false| skips a frame
      }
    }
    try {
      func();
    } catch (e) {
      if (e instanceof ExitStatus) {
        return;
      } else {
        if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
        throw e;
      }
    }
    if (Module['postMainLoop']) Module['postMainLoop']();
  }},isFullscreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
  if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers

  if (Browser.initted) return;
  Browser.initted = true;

  try {
    new Blob();
    Browser.hasBlobConstructor = true;
  } catch(e) {
    Browser.hasBlobConstructor = false;
    console.log("warning: no blob constructor, cannot create blobs with mimetypes");
  }
  Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
  Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
  if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
    console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
    Module.noImageDecoding = true;
  }

  // Support for plugins that can process preloaded files. You can add more of these to
  // your app by creating and appending to Module.preloadPlugins.
  //
  // Each plugin is asked if it can handle a file based on the file's name. If it can,
  // it is given the file's raw data. When it is done, it calls a callback with the file's
  // (possibly modified) data. For example, a plugin might decompress a file, or it
  // might create some side data structure for use later (like an Image element, etc.).

  var imagePlugin = {};
  imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
    return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
  };
  imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
    var b = null;
    if (Browser.hasBlobConstructor) {
      try {
        b = new Blob([byteArray], { type: Browser.getMimetype(name) });
        if (b.size !== byteArray.length) { // Safari bug #118630
          // Safari's Blob can only take an ArrayBuffer
          b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
        }
      } catch(e) {
        Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
      }
    }
    if (!b) {
      var bb = new Browser.BlobBuilder();
      bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
      b = bb.getBlob();
    }
    var url = Browser.URLObject.createObjectURL(b);
    assert(typeof url == 'string', 'createObjectURL must return a url as a string');
    var img = new Image();
    img.onload = function img_onload() {
      assert(img.complete, 'Image ' + name + ' could not be decoded');
      var canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      Module["preloadedImages"][name] = canvas;
      Browser.URLObject.revokeObjectURL(url);
      if (onload) onload(byteArray);
    };
    img.onerror = function img_onerror(event) {
      console.log('Image ' + url + ' could not be decoded');
      if (onerror) onerror();
    };
    img.src = url;
  };
  Module['preloadPlugins'].push(imagePlugin);

  var audioPlugin = {};
  audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
    return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
  };
  audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
    var done = false;
    function finish(audio) {
      if (done) return;
      done = true;
      Module["preloadedAudios"][name] = audio;
      if (onload) onload(byteArray);
    }
    function fail() {
      if (done) return;
      done = true;
      Module["preloadedAudios"][name] = new Audio(); // empty shim
      if (onerror) onerror();
    }
    if (Browser.hasBlobConstructor) {
      try {
        var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
      } catch(e) {
        return fail();
      }
      var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
      assert(typeof url == 'string', 'createObjectURL must return a url as a string');
      var audio = new Audio();
      audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
      audio.onerror = function audio_onerror(event) {
        if (done) return;
        console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
        function encode64(data) {
          var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
          var PAD = '=';
          var ret = '';
          var leftchar = 0;
          var leftbits = 0;
          for (var i = 0; i < data.length; i++) {
            leftchar = (leftchar << 8) | data[i];
            leftbits += 8;
            while (leftbits >= 6) {
              var curr = (leftchar >> (leftbits-6)) & 0x3f;
              leftbits -= 6;
              ret += BASE[curr];
            }
          }
          if (leftbits == 2) {
            ret += BASE[(leftchar&3) << 4];
            ret += PAD + PAD;
          } else if (leftbits == 4) {
            ret += BASE[(leftchar&0xf) << 2];
            ret += PAD;
          }
          return ret;
        }
        audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
        finish(audio); // we don't wait for confirmation this worked - but it's worth trying
      };
      audio.src = url;
      // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
      Browser.safeSetTimeout(function() {
        finish(audio); // try to use it even though it is not necessarily ready to play
      }, 10000);
    } else {
      return fail();
    }
  };
  Module['preloadPlugins'].push(audioPlugin);

  // Canvas event setup

  function pointerLockChange() {
    Browser.pointerLock = document['pointerLockElement'] === Module['canvas'] ||
                          document['mozPointerLockElement'] === Module['canvas'] ||
                          document['webkitPointerLockElement'] === Module['canvas'] ||
                          document['msPointerLockElement'] === Module['canvas'];
  }
  var canvas = Module['canvas'];
  if (canvas) {
    // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
    // Module['forcedAspectRatio'] = 4 / 3;
    
    canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                canvas['mozRequestPointerLock'] ||
                                canvas['webkitRequestPointerLock'] ||
                                canvas['msRequestPointerLock'] ||
                                function(){};
    canvas.exitPointerLock = document['exitPointerLock'] ||
                             document['mozExitPointerLock'] ||
                             document['webkitExitPointerLock'] ||
                             document['msExitPointerLock'] ||
                             function(){}; // no-op if function does not exist
    canvas.exitPointerLock = canvas.exitPointerLock.bind(document);

    document.addEventListener('pointerlockchange', pointerLockChange, false);
    document.addEventListener('mozpointerlockchange', pointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
    document.addEventListener('mspointerlockchange', pointerLockChange, false);

    if (Module['elementPointerLock']) {
      canvas.addEventListener("click", function(ev) {
        if (!Browser.pointerLock && Module['canvas'].requestPointerLock) {
          Module['canvas'].requestPointerLock();
          ev.preventDefault();
        }
      }, false);
    }
  }
},createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
  if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.

  var ctx;
  var contextHandle;
  if (useWebGL) {
    // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
    var contextAttributes = {
      antialias: false,
      alpha: false
    };

    if (webGLContextAttributes) {
      for (var attribute in webGLContextAttributes) {
        contextAttributes[attribute] = webGLContextAttributes[attribute];
      }
    }

    contextHandle = GL.createContext(canvas, contextAttributes);
    if (contextHandle) {
      ctx = GL.getContext(contextHandle).GLctx;
    }
  } else {
    ctx = canvas.getContext('2d');
  }

  if (!ctx) return null;

  if (setInModule) {
    if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');

    Module.ctx = ctx;
    if (useWebGL) GL.makeContextCurrent(contextHandle);
    Module.useWebGL = useWebGL;
    Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
    Browser.init();
  }
  return ctx;
},destroyContext:function (canvas, useWebGL, setInModule) {},fullscreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullscreen:function (lockPointer, resizeCanvas, vrDevice) {
  Browser.lockPointer = lockPointer;
  Browser.resizeCanvas = resizeCanvas;
  Browser.vrDevice = vrDevice;
  if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
  if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  if (typeof Browser.vrDevice === 'undefined') Browser.vrDevice = null;

  var canvas = Module['canvas'];
  function fullscreenChange() {
    Browser.isFullscreen = false;
    var canvasContainer = canvas.parentNode;
    if ((document['fullscreenElement'] || document['mozFullScreenElement'] ||
         document['msFullscreenElement'] || document['webkitFullscreenElement'] ||
         document['webkitCurrentFullScreenElement']) === canvasContainer) {
      canvas.exitFullscreen = document['exitFullscreen'] ||
                              document['cancelFullScreen'] ||
                              document['mozCancelFullScreen'] ||
                              document['msExitFullscreen'] ||
                              document['webkitCancelFullScreen'] ||
                              function() {};
      canvas.exitFullscreen = canvas.exitFullscreen.bind(document);
      if (Browser.lockPointer) canvas.requestPointerLock();
      Browser.isFullscreen = true;
      if (Browser.resizeCanvas) Browser.setFullscreenCanvasSize();
    } else {
      
      // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
      canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
      canvasContainer.parentNode.removeChild(canvasContainer);
      
      if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
    }
    if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullscreen);
    if (Module['onFullscreen']) Module['onFullscreen'](Browser.isFullscreen);
    Browser.updateCanvasDimensions(canvas);
  }

  if (!Browser.fullscreenHandlersInstalled) {
    Browser.fullscreenHandlersInstalled = true;
    document.addEventListener('fullscreenchange', fullscreenChange, false);
    document.addEventListener('mozfullscreenchange', fullscreenChange, false);
    document.addEventListener('webkitfullscreenchange', fullscreenChange, false);
    document.addEventListener('MSFullscreenChange', fullscreenChange, false);
  }

  // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
  var canvasContainer = document.createElement("div");
  canvas.parentNode.insertBefore(canvasContainer, canvas);
  canvasContainer.appendChild(canvas);

  // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
  canvasContainer.requestFullscreen = canvasContainer['requestFullscreen'] ||
                                      canvasContainer['mozRequestFullScreen'] ||
                                      canvasContainer['msRequestFullscreen'] ||
                                     (canvasContainer['webkitRequestFullscreen'] ? function() { canvasContainer['webkitRequestFullscreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null) ||
                                     (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);

  if (vrDevice) {
    canvasContainer.requestFullscreen({ vrDisplay: vrDevice });
  } else {
    canvasContainer.requestFullscreen();
  }
},requestFullScreen:function (lockPointer, resizeCanvas, vrDevice) {
    Module.printErr('Browser.requestFullScreen() is deprecated. Please call Browser.requestFullscreen instead.');
    Browser.requestFullScreen = function(lockPointer, resizeCanvas, vrDevice) {
      return Browser.requestFullscreen(lockPointer, resizeCanvas, vrDevice);
    }
    return Browser.requestFullscreen(lockPointer, resizeCanvas, vrDevice);
},nextRAF:0,fakeRequestAnimationFrame:function (func) {
  // try to keep 60fps between calls to here
  var now = Date.now();
  if (Browser.nextRAF === 0) {
    Browser.nextRAF = now + 1000/60;
  } else {
    while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
      Browser.nextRAF += 1000/60;
    }
  }
  var delay = Math.max(Browser.nextRAF - now, 0);
  setTimeout(func, delay);
},requestAnimationFrame:function requestAnimationFrame(func) {
  if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
    Browser.fakeRequestAnimationFrame(func);
  } else {
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                     window['mozRequestAnimationFrame'] ||
                                     window['webkitRequestAnimationFrame'] ||
                                     window['msRequestAnimationFrame'] ||
                                     window['oRequestAnimationFrame'] ||
                                     Browser.fakeRequestAnimationFrame;
    }
    window.requestAnimationFrame(func);
  }
},safeCallback:function (func) {
  return function() {
    if (!ABORT) return func.apply(null, arguments);
  };
},allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function () {
  Browser.allowAsyncCallbacks = false;
},resumeAsyncCallbacks:function () { // marks future callbacks as ok to execute, and synchronously runs any remaining ones right now
  Browser.allowAsyncCallbacks = true;
  if (Browser.queuedAsyncCallbacks.length > 0) {
    var callbacks = Browser.queuedAsyncCallbacks;
    Browser.queuedAsyncCallbacks = [];
    callbacks.forEach(function(func) {
      func();
    });
  }
},safeRequestAnimationFrame:function (func) {
  return Browser.requestAnimationFrame(function() {
    if (ABORT) return;
    if (Browser.allowAsyncCallbacks) {
      func();
    } else {
      Browser.queuedAsyncCallbacks.push(func);
    }
  });
},safeSetTimeout:function (func, timeout) {
  Module['noExitRuntime'] = true;
  return setTimeout(function() {
    if (ABORT) return;
    if (Browser.allowAsyncCallbacks) {
      func();
    } else {
      Browser.queuedAsyncCallbacks.push(func);
    }
  }, timeout);
},safeSetInterval:function (func, timeout) {
  Module['noExitRuntime'] = true;
  return setInterval(function() {
    if (ABORT) return;
    if (Browser.allowAsyncCallbacks) {
      func();
    } // drop it on the floor otherwise, next interval will kick in
  }, timeout);
},getMimetype:function (name) {
  return {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'bmp': 'image/bmp',
    'ogg': 'audio/ogg',
    'wav': 'audio/wav',
    'mp3': 'audio/mpeg'
  }[name.substr(name.lastIndexOf('.')+1)];
},getUserMedia:function (func) {
  if(!window.getUserMedia) {
    window.getUserMedia = navigator['getUserMedia'] ||
                          navigator['mozGetUserMedia'];
  }
  window.getUserMedia(func);
},getMovementX:function (event) {
  return event['movementX'] ||
         event['mozMovementX'] ||
         event['webkitMovementX'] ||
         0;
},getMovementY:function (event) {
  return event['movementY'] ||
         event['mozMovementY'] ||
         event['webkitMovementY'] ||
         0;
},getMouseWheelDelta:function (event) {
  var delta = 0;
  switch (event.type) {
    case 'DOMMouseScroll': 
      delta = event.detail;
      break;
    case 'mousewheel': 
      delta = event.wheelDelta;
      break;
    case 'wheel': 
      delta = event['deltaY'];
      break;
    default:
      throw 'unrecognized mouse wheel event: ' + event.type;
  }
  return delta;
},mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
  if (Browser.pointerLock) {
    // When the pointer is locked, calculate the coordinates
    // based on the movement of the mouse.
    // Workaround for Firefox bug 764498
    if (event.type != 'mousemove' &&
        ('mozMovementX' in event)) {
      Browser.mouseMovementX = Browser.mouseMovementY = 0;
    } else {
      Browser.mouseMovementX = Browser.getMovementX(event);
      Browser.mouseMovementY = Browser.getMovementY(event);
    }
    
    // check if SDL is available
    if (typeof SDL != "undefined") {
      Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
      Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
    } else {
      // just add the mouse delta to the current absolut mouse position
      // FIXME: ideally this should be clamped against the canvas size and zero
      Browser.mouseX += Browser.mouseMovementX;
      Browser.mouseY += Browser.mouseMovementY;
    }        
  } else {
    // Otherwise, calculate the movement based on the changes
    // in the coordinates.
    var rect = Module["canvas"].getBoundingClientRect();
    var cw = Module["canvas"].width;
    var ch = Module["canvas"].height;

    // Neither .scrollX or .pageXOffset are defined in a spec, but
    // we prefer .scrollX because it is currently in a spec draft.
    // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
    var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
    var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
    // If this assert lands, it's likely because the browser doesn't support scrollX or pageXOffset
    // and we have no viable fallback.
    assert((typeof scrollX !== 'undefined') && (typeof scrollY !== 'undefined'), 'Unable to retrieve scroll position, mouse positions likely broken.');

    if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
      var touch = event.touch;
      if (touch === undefined) {
        return; // the "touch" property is only defined in SDL

      }
      var adjustedX = touch.pageX - (scrollX + rect.left);
      var adjustedY = touch.pageY - (scrollY + rect.top);

      adjustedX = adjustedX * (cw / rect.width);
      adjustedY = adjustedY * (ch / rect.height);

      var coords = { x: adjustedX, y: adjustedY };
      
      if (event.type === 'touchstart') {
        Browser.lastTouches[touch.identifier] = coords;
        Browser.touches[touch.identifier] = coords;
      } else if (event.type === 'touchend' || event.type === 'touchmove') {
        var last = Browser.touches[touch.identifier];
        if (!last) last = coords;
        Browser.lastTouches[touch.identifier] = last;
        Browser.touches[touch.identifier] = coords;
      } 
      return;
    }

    var x = event.pageX - (scrollX + rect.left);
    var y = event.pageY - (scrollY + rect.top);

    // the canvas might be CSS-scaled compared to its backbuffer;
    // SDL-using content will want mouse coordinates in terms
    // of backbuffer units.
    x = x * (cw / rect.width);
    y = y * (ch / rect.height);

    Browser.mouseMovementX = x - Browser.mouseX;
    Browser.mouseMovementY = y - Browser.mouseY;
    Browser.mouseX = x;
    Browser.mouseY = y;
  }
},asyncLoad:function (url, onload, onerror, noRunDep) {
  var dep = !noRunDep ? getUniqueRunDependency('al ' + url) : '';
  Module['readAsync'](url, function(arrayBuffer) {
    assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
    onload(new Uint8Array(arrayBuffer));
    if (dep) removeRunDependency(dep);
  }, function(event) {
    if (onerror) {
      onerror();
    } else {
      throw 'Loading data file "' + url + '" failed.';
    }
  });
  if (dep) addRunDependency(dep);
},resizeListeners:[],updateResizeListeners:function () {
  var canvas = Module['canvas'];
  Browser.resizeListeners.forEach(function(listener) {
    listener(canvas.width, canvas.height);
  });
},setCanvasSize:function (width, height, noUpdates) {
  var canvas = Module['canvas'];
  Browser.updateCanvasDimensions(canvas, width, height);
  if (!noUpdates) Browser.updateResizeListeners();
},windowedWidth:0,windowedHeight:0,setFullscreenCanvasSize:function () {
  // check if SDL is available   
  if (typeof SDL != "undefined") {
    var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
    flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
    HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
  }
  Browser.updateResizeListeners();
},setWindowedCanvasSize:function () {
  // check if SDL is available       
  if (typeof SDL != "undefined") {
    var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
    flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
    HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
  }
  Browser.updateResizeListeners();
},updateCanvasDimensions:function (canvas, wNative, hNative) {
  if (wNative && hNative) {
    canvas.widthNative = wNative;
    canvas.heightNative = hNative;
  } else {
    wNative = canvas.widthNative;
    hNative = canvas.heightNative;
  }
  var w = wNative;
  var h = hNative;
  if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
    if (w/h < Module['forcedAspectRatio']) {
      w = Math.round(h * Module['forcedAspectRatio']);
    } else {
      h = Math.round(w / Module['forcedAspectRatio']);
    }
  }
  if (((document['fullscreenElement'] || document['mozFullScreenElement'] ||
       document['msFullscreenElement'] || document['webkitFullscreenElement'] ||
       document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
     var factor = Math.min(screen.width / w, screen.height / h);
     w = Math.round(w * factor);
     h = Math.round(h * factor);
  }
  if (Browser.resizeCanvas) {
    if (canvas.width  != w) canvas.width  = w;
    if (canvas.height != h) canvas.height = h;
    if (typeof canvas.style != 'undefined') {
      canvas.style.removeProperty( "width");
      canvas.style.removeProperty("height");
    }
  } else {
    if (canvas.width  != wNative) canvas.width  = wNative;
    if (canvas.height != hNative) canvas.height = hNative;
    if (typeof canvas.style != 'undefined') {
      if (w != wNative || h != hNative) {
        canvas.style.setProperty( "width", w + "px", "important");
        canvas.style.setProperty("height", h + "px", "important");
      } else {
        canvas.style.removeProperty( "width");
        canvas.style.removeProperty("height");
      }
    }
  }
},wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
  var handle = Browser.nextWgetRequestHandle;
  Browser.nextWgetRequestHandle++;
  return handle;
}};var EGL={errorCode:12288,defaultDisplayInitialized:false,currentContext:0,currentReadSurface:0,currentDrawSurface:0,stringCache:{},setErrorCode:function (code) {
  EGL.errorCode = code;
},chooseConfig:function (display, attribList, config, config_size, numConfigs) { 
  if (display != 62000 /* Magic ID for Emscripten 'default display' */) {
    EGL.setErrorCode(0x3008 /* EGL_BAD_DISPLAY */);
    return 0;
  }
  // TODO: read attribList.
  if ((!config || !config_size) && !numConfigs) {
    EGL.setErrorCode(0x300C /* EGL_BAD_PARAMETER */);
    return 0;
  }
  if (numConfigs) {
    HEAP32[((numConfigs)>>2)]=1; // Total number of supported configs: 1.
  }
  if (config && config_size > 0) {
    HEAP32[((config)>>2)]=62002; 
  }
  
  EGL.setErrorCode(0x3000 /* EGL_SUCCESS */);
  return 1;
}};

function _eglWaitClient() {
EGL.setErrorCode(0x3000 /* EGL_SUCCESS */);
return 1;
}function _eglChooseConfig(display, attrib_list, configs, config_size, numConfigs) { 
return EGL.chooseConfig(display, attrib_list, configs, config_size, numConfigs);
}

function _eglGetDisplay(nativeDisplayType) {
EGL.setErrorCode(0x3000 /* EGL_SUCCESS */);
// Note: As a 'conformant' implementation of EGL, we would prefer to init here only if the user
//       calls this function with EGL_DEFAULT_DISPLAY. Other display IDs would be preferred to be unsupported
//       and EGL_NO_DISPLAY returned. Uncomment the following code lines to do this.
// Instead, an alternative route has been preferred, namely that the Emscripten EGL implementation
// "emulates" X11, and eglGetDisplay is expected to accept/receive a pointer to an X11 Display object.
// Therefore, be lax and allow anything to be passed in, and return the magic handle to our default EGLDisplay object.

//    if (nativeDisplayType == 0 /* EGL_DEFAULT_DISPLAY */) {
    return 62000; // Magic ID for Emscripten 'default display'
//    }
//    else
//      return 0; // EGL_NO_DISPLAY
}

function _glDrawArrays(mode, first, count) {

GLctx.drawArrays(mode, first, count);

}

function ___unlock() {}

function _XOpenDisplay() {
return 1; // We support 1 display, the canvas
}

function _glClear(x0) { GLctx['clear'](x0) }

function _XStoreName(){}

function ___lock() {}

function _glGenBuffers(n, buffers) {
for (var i = 0; i < n; i++) {
  var buffer = GLctx.createBuffer();
  if (!buffer) {
    GL.recordError(0x0502 /* GL_INVALID_OPERATION */);
    while(i < n) HEAP32[(((buffers)+(i++*4))>>2)]=0;
    return;
  }
  var id = GL.getNewId(GL.buffers);
  buffer.name = id;
  GL.buffers[id] = buffer;
  HEAP32[(((buffers)+(i*4))>>2)]=id;
}
}

function _glDeleteProgram(id) {
if (!id) return;
var program = GL.programs[id];
if (!program) { // glDeleteProgram actually signals an error when deleting a nonexisting object, unlike some other GL delete functions.
  GL.recordError(0x0501 /* GL_INVALID_VALUE */);
  return;
}
GLctx.deleteProgram(program);
program.name = 0;
GL.programs[id] = null;
GL.programInfos[id] = null;
}

function _glEnableVertexAttribArray(index) {
GLctx.enableVertexAttribArray(index);
}

function _glBindBuffer(target, buffer) {
var bufferObj = buffer ? GL.buffers[buffer] : null;


GLctx.bindBuffer(target, bufferObj);
}



var GLUT={initTime:null,idleFunc:null,displayFunc:null,keyboardFunc:null,keyboardUpFunc:null,specialFunc:null,specialUpFunc:null,reshapeFunc:null,motionFunc:null,passiveMotionFunc:null,mouseFunc:null,buttons:0,modifiers:0,initWindowWidth:256,initWindowHeight:256,initDisplayMode:18,windowX:0,windowY:0,windowWidth:0,windowHeight:0,requestedAnimationFrame:false,saveModifiers:function (event) {
  GLUT.modifiers = 0;
  if (event['shiftKey'])
    GLUT.modifiers += 1; /* GLUT_ACTIVE_SHIFT */
  if (event['ctrlKey'])
    GLUT.modifiers += 2; /* GLUT_ACTIVE_CTRL */
  if (event['altKey'])
    GLUT.modifiers += 4; /* GLUT_ACTIVE_ALT */
},onMousemove:function (event) {
  /* Send motion event only if the motion changed, prevents
   * spamming our app with uncessary callback call. It does happen in
   * Chrome on Windows.
   */
  var lastX = Browser.mouseX;
  var lastY = Browser.mouseY;
  Browser.calculateMouseEvent(event);
  var newX = Browser.mouseX;
  var newY = Browser.mouseY;
  if (newX == lastX && newY == lastY) return;

  if (GLUT.buttons == 0 && event.target == Module["canvas"] && GLUT.passiveMotionFunc) {
    event.preventDefault();
    GLUT.saveModifiers(event);
    Module['dynCall_vii'](GLUT.passiveMotionFunc, lastX, lastY);
  } else if (GLUT.buttons != 0 && GLUT.motionFunc) {
    event.preventDefault();
    GLUT.saveModifiers(event);
    Module['dynCall_vii'](GLUT.motionFunc, lastX, lastY);
  }
},getSpecialKey:function (keycode) {
    var key = null;
    switch (keycode) {
      case 8:  key = 120 /* backspace */; break;
      case 46: key = 111 /* delete */; break;

      case 0x70 /*DOM_VK_F1*/: key = 1 /* GLUT_KEY_F1 */; break;
      case 0x71 /*DOM_VK_F2*/: key = 2 /* GLUT_KEY_F2 */; break;
      case 0x72 /*DOM_VK_F3*/: key = 3 /* GLUT_KEY_F3 */; break;
      case 0x73 /*DOM_VK_F4*/: key = 4 /* GLUT_KEY_F4 */; break;
      case 0x74 /*DOM_VK_F5*/: key = 5 /* GLUT_KEY_F5 */; break;
      case 0x75 /*DOM_VK_F6*/: key = 6 /* GLUT_KEY_F6 */; break;
      case 0x76 /*DOM_VK_F7*/: key = 7 /* GLUT_KEY_F7 */; break;
      case 0x77 /*DOM_VK_F8*/: key = 8 /* GLUT_KEY_F8 */; break;
      case 0x78 /*DOM_VK_F9*/: key = 9 /* GLUT_KEY_F9 */; break;
      case 0x79 /*DOM_VK_F10*/: key = 10 /* GLUT_KEY_F10 */; break;
      case 0x7a /*DOM_VK_F11*/: key = 11 /* GLUT_KEY_F11 */; break;
      case 0x7b /*DOM_VK_F12*/: key = 12 /* GLUT_KEY_F12 */; break;
      case 0x25 /*DOM_VK_LEFT*/: key = 100 /* GLUT_KEY_LEFT */; break;
      case 0x26 /*DOM_VK_UP*/: key = 101 /* GLUT_KEY_UP */; break;
      case 0x27 /*DOM_VK_RIGHT*/: key = 102 /* GLUT_KEY_RIGHT */; break;
      case 0x28 /*DOM_VK_DOWN*/: key = 103 /* GLUT_KEY_DOWN */; break;
      case 0x21 /*DOM_VK_PAGE_UP*/: key = 104 /* GLUT_KEY_PAGE_UP */; break;
      case 0x22 /*DOM_VK_PAGE_DOWN*/: key = 105 /* GLUT_KEY_PAGE_DOWN */; break;
      case 0x24 /*DOM_VK_HOME*/: key = 106 /* GLUT_KEY_HOME */; break;
      case 0x23 /*DOM_VK_END*/: key = 107 /* GLUT_KEY_END */; break;
      case 0x2d /*DOM_VK_INSERT*/: key = 108 /* GLUT_KEY_INSERT */; break;

      case 16   /*DOM_VK_SHIFT*/:
      case 0x05 /*DOM_VK_LEFT_SHIFT*/:
        key = 112 /* GLUT_KEY_SHIFT_L */;
        break;
      case 0x06 /*DOM_VK_RIGHT_SHIFT*/:
        key = 113 /* GLUT_KEY_SHIFT_R */;
        break;

      case 17   /*DOM_VK_CONTROL*/:
      case 0x03 /*DOM_VK_LEFT_CONTROL*/:
        key = 114 /* GLUT_KEY_CONTROL_L */;
        break;
      case 0x04 /*DOM_VK_RIGHT_CONTROL*/:
        key = 115 /* GLUT_KEY_CONTROL_R */;
        break;

      case 18   /*DOM_VK_ALT*/:
      case 0x02 /*DOM_VK_LEFT_ALT*/:
        key = 116 /* GLUT_KEY_ALT_L */;
        break;
      case 0x01 /*DOM_VK_RIGHT_ALT*/:
        key = 117 /* GLUT_KEY_ALT_R */;
        break;
    };
    return key;
},getASCIIKey:function (event) {
  if (event['ctrlKey'] || event['altKey'] || event['metaKey']) return null;

  var keycode = event['keyCode'];

  /* The exact list is soooo hard to find in a canonical place! */

  if (48 <= keycode && keycode <= 57)
    return keycode; // numeric  TODO handle shift?
  if (65 <= keycode && keycode <= 90)
    return event['shiftKey'] ? keycode : keycode + 32;
  if (96 <= keycode && keycode <= 105)
    return keycode - 48; // numpad numbers    
  if (106 <= keycode && keycode <= 111)
    return keycode - 106 + 42; // *,+-./  TODO handle shift?

  switch (keycode) {
    case 9:  // tab key
    case 13: // return key
    case 27: // escape
    case 32: // space
    case 61: // equal
      return keycode;
  }

  var s = event['shiftKey'];
  switch (keycode) {
    case 186: return s ? 58 : 59; // colon / semi-colon
    case 187: return s ? 43 : 61; // add / equal (these two may be wrong)
    case 188: return s ? 60 : 44; // less-than / comma
    case 189: return s ? 95 : 45; // dash
    case 190: return s ? 62 : 46; // greater-than / period
    case 191: return s ? 63 : 47; // forward slash
    case 219: return s ? 123 : 91; // open bracket
    case 220: return s ? 124 : 47; // back slash
    case 221: return s ? 125 : 93; // close braket
    case 222: return s ? 34 : 39; // single quote
  }

  return null;
},onKeydown:function (event) {
  if (GLUT.specialFunc || GLUT.keyboardFunc) {
    var key = GLUT.getSpecialKey(event['keyCode']);
    if (key !== null) {
      if( GLUT.specialFunc ) {
        event.preventDefault();
        GLUT.saveModifiers(event);
        Module['dynCall_viii'](GLUT.specialFunc, key, Browser.mouseX, Browser.mouseY);
      }
    }
    else
    {
      key = GLUT.getASCIIKey(event);
      if( key !== null && GLUT.keyboardFunc ) {
        event.preventDefault();
        GLUT.saveModifiers(event);
        Module['dynCall_viii'](GLUT.keyboardFunc, key, Browser.mouseX, Browser.mouseY);
      }
    }
  }
},onKeyup:function (event) {
  if (GLUT.specialUpFunc || GLUT.keyboardUpFunc) {
    var key = GLUT.getSpecialKey(event['keyCode']);
    if (key !== null) {
      if(GLUT.specialUpFunc) {
        event.preventDefault ();
        GLUT.saveModifiers(event);
        Module['dynCall_viii'](GLUT.specialUpFunc, key, Browser.mouseX, Browser.mouseY);
      }
    }
    else
    {
      key = GLUT.getASCIIKey(event);
      if( key !== null && GLUT.keyboardUpFunc ) {
        event.preventDefault ();
        GLUT.saveModifiers(event);
        Module['dynCall_viii'](GLUT.keyboardUpFunc, key, Browser.mouseX, Browser.mouseY);
      }
    }
  }
},touchHandler:function (event) {
  if (event.target != Module['canvas']) {
    return;
  }

  var touches = event.changedTouches,
      main = touches[0],
      type = "";

  switch(event.type) {
    case "touchstart": type = "mousedown"; break;
    case "touchmove": type = "mousemove"; break;
    case "touchend": type = "mouseup"; break;
    default: return;
  }

  var simulatedEvent = document.createEvent("MouseEvent");
  simulatedEvent.initMouseEvent(type, true, true, window, 1, 
                                main.screenX, main.screenY, 
                                main.clientX, main.clientY, false, 
                                false, false, false, 0/*main*/, null);

  main.target.dispatchEvent(simulatedEvent);
  event.preventDefault();
},onMouseButtonDown:function (event) {
  Browser.calculateMouseEvent(event);

  GLUT.buttons |= (1 << event['button']);

  if (event.target == Module["canvas"] && GLUT.mouseFunc) {
    try {
      event.target.setCapture();
    } catch (e) {}
    event.preventDefault();
    GLUT.saveModifiers(event);
    Module['dynCall_viiii'](GLUT.mouseFunc, event['button'], 0/*GLUT_DOWN*/, Browser.mouseX, Browser.mouseY);
  }
},onMouseButtonUp:function (event) {
  Browser.calculateMouseEvent(event);

  GLUT.buttons &= ~(1 << event['button']);

  if (GLUT.mouseFunc) {
    event.preventDefault();
    GLUT.saveModifiers(event);
    Module['dynCall_viiii'](GLUT.mouseFunc, event['button'], 1/*GLUT_UP*/, Browser.mouseX, Browser.mouseY);
  }
},onMouseWheel:function (event) {
  Browser.calculateMouseEvent(event);

  // cross-browser wheel delta
  var e = window.event || event; // old IE support
  // Note the minus sign that flips browser wheel direction (positive direction scrolls page down) to native wheel direction (positive direction is mouse wheel up)
  var delta = -Browser.getMouseWheelDelta(event);
  delta = (delta == 0) ? 0 : (delta > 0 ? Math.max(delta, 1) : Math.min(delta, -1)); // Quantize to integer so that minimum scroll is at least +/- 1.

  var button = 3; // wheel up
  if (delta < 0) {
    button = 4; // wheel down
  }

  if (GLUT.mouseFunc) {
    event.preventDefault();
    GLUT.saveModifiers(event);
    Module['dynCall_viiii'](GLUT.mouseFunc, button, 0/*GLUT_DOWN*/, Browser.mouseX, Browser.mouseY);
  }
},onFullscreenEventChange:function (event) {
  var width;
  var height;
  if (document["fullscreen"] || document["fullScreen"] || document["mozFullScreen"] || document["webkitIsFullScreen"]) {
    width = screen["width"];
    height = screen["height"];
  } else {
    width = GLUT.windowWidth;
    height = GLUT.windowHeight;
    // TODO set position
    document.removeEventListener('fullscreenchange', GLUT.onFullscreenEventChange, true);
    document.removeEventListener('mozfullscreenchange', GLUT.onFullscreenEventChange, true);
    document.removeEventListener('webkitfullscreenchange', GLUT.onFullscreenEventChange, true);
  }
  Browser.setCanvasSize(width, height);
  /* Can't call _glutReshapeWindow as that requests cancelling fullscreen. */
  if (GLUT.reshapeFunc) {
    // console.log("GLUT.reshapeFunc (from FS): " + width + ", " + height);
    Module['dynCall_vii'](GLUT.reshapeFunc, width, height);
  }
  _glutPostRedisplay();
},requestFullscreen:function () {
  Browser.requestFullscreen(/*lockPointer=*/false, /*resieCanvas=*/false);
},requestFullScreen:function () {
  Module.printErr('GLUT.requestFullScreen() is deprecated. Please call GLUT.requestFullscreen instead.');
  GLUT.requestFullScreen = function() {
    return GLUT.requestFullscreen();
  }
  return GLUT.requestFullscreen();
},exitFullscreen:function () {
  var CFS = document['exitFullscreen'] ||
            document['cancelFullScreen'] ||
            document['mozCancelFullScreen'] ||
            document['webkitCancelFullScreen'] ||
      (function() {});
  CFS.apply(document, []);
},cancelFullScreen:function () {
  Module.printErr('GLUT.cancelFullScreen() is deprecated. Please call GLUT.exitFullscreen instead.');
  GLUT.cancelFullScreen = function() {
    return GLUT.exitFullscreen();
  }
  return GLUT.exitFullscreen();
}};function _glutInitDisplayMode(mode) {
GLUT.initDisplayMode = mode;
}

function _glutCreateWindow(name) {
var contextAttributes = {
  antialias: ((GLUT.initDisplayMode & 0x0080 /*GLUT_MULTISAMPLE*/) != 0),
  depth: ((GLUT.initDisplayMode & 0x0010 /*GLUT_DEPTH*/) != 0),
  stencil: ((GLUT.initDisplayMode & 0x0020 /*GLUT_STENCIL*/) != 0),
  alpha: ((GLUT.initDisplayMode & 0x0008 /*GLUT_ALPHA*/) != 0)
};
Module.ctx = Browser.createContext(Module['canvas'], true, true, contextAttributes);
return Module.ctx ? 1 /* a new GLUT window ID for the created context */ : 0 /* failure */;
}function _eglCreateContext(display, config, hmm, contextAttribs) {
if (display != 62000 /* Magic ID for Emscripten 'default display' */) {
  EGL.setErrorCode(0x3008 /* EGL_BAD_DISPLAY */);
  return 0;
}

// EGL 1.4 spec says default EGL_CONTEXT_CLIENT_VERSION is GLES1, but this is not supported by Emscripten.
// So user must pass EGL_CONTEXT_CLIENT_VERSION == 2 to initialize EGL.
var glesContextVersion = 1;
for(;;) {
  var param = HEAP32[((contextAttribs)>>2)];
  if (param == 0x3098 /*EGL_CONTEXT_CLIENT_VERSION*/) {
    glesContextVersion = HEAP32[(((contextAttribs)+(4))>>2)];
  } else if (param == 0x3038 /*EGL_NONE*/) {
    break;
  } else {
    /* EGL1.4 specifies only EGL_CONTEXT_CLIENT_VERSION as supported attribute */
    EGL.setErrorCode(0x3004 /*EGL_BAD_ATTRIBUTE*/);
    return 0;
  }
  contextAttribs += 8;
}
if (glesContextVersion != 2) {
  EGL.setErrorCode(0x3005 /* EGL_BAD_CONFIG */);
  return 0; /* EGL_NO_CONTEXT */
}

_glutInitDisplayMode(0xB2 /* GLUT_RGBA | GLUT_DOUBLE | GLUT_DEPTH | GLUT_MULTISAMPLE | GLUT_STENCIL */);
EGL.windowID = _glutCreateWindow();
if (EGL.windowID != 0) {
  EGL.setErrorCode(0x3000 /* EGL_SUCCESS */);
  // Note: This function only creates a context, but it shall not make it active.
  return 62004; // Magic ID for Emscripten EGLContext
} else {
  EGL.setErrorCode(0x3009 /* EGL_BAD_MATCH */); // By the EGL 1.4 spec, an implementation that does not support GLES2 (WebGL in this case), this error code is set.
  return 0; /* EGL_NO_CONTEXT */
}
}

function _glAttachShader(program, shader) {
GLctx.attachShader(GL.programs[program],
                        GL.shaders[shader]);
}

function _glCompileShader(shader) {
GLctx.compileShader(GL.shaders[shader]);
}

function _glDeleteShader(id) {
if (!id) return;
var shader = GL.shaders[id];
if (!shader) { // glDeleteShader actually signals an error when deleting a nonexisting object, unlike some other GL delete functions.
  GL.recordError(0x0501 /* GL_INVALID_VALUE */);
  return;
}
GLctx.deleteShader(shader);
GL.shaders[id] = null;
}

function _eglSwapBuffers() {

if (!EGL.defaultDisplayInitialized) {
  EGL.setErrorCode(0x3001 /* EGL_NOT_INITIALIZED */);
} else if (!Module.ctx) {
  EGL.setErrorCode(0x3002 /* EGL_BAD_ACCESS */);
} else if (Module.ctx.isContextLost()) {
  EGL.setErrorCode(0x300E /* EGL_CONTEXT_LOST */);
} else {
  // According to documentation this does an implicit flush.
  // Due to discussion at https://github.com/kripken/emscripten/pull/1871
  // the flush was removed since this _may_ result in slowing code down.
  //_glFlush();
  EGL.setErrorCode(0x3000 /* EGL_SUCCESS */);
  return 1 /* EGL_TRUE */;
}
return 0 /* EGL_FALSE */;
}

function _eglCreateWindowSurface(display, config, win, attrib_list) { 
if (display != 62000 /* Magic ID for Emscripten 'default display' */) {
  EGL.setErrorCode(0x3008 /* EGL_BAD_DISPLAY */);
  return 0;
}
if (config != 62002 /* Magic ID for the only EGLConfig supported by Emscripten */) {
  EGL.setErrorCode(0x3005 /* EGL_BAD_CONFIG */);
  return 0;
}
// TODO: Examine attrib_list! Parameters that can be present there are:
// - EGL_RENDER_BUFFER (must be EGL_BACK_BUFFER)
// - EGL_VG_COLORSPACE (can't be set)
// - EGL_VG_ALPHA_FORMAT (can't be set)
EGL.setErrorCode(0x3000 /* EGL_SUCCESS */);
return 62006; /* Magic ID for Emscripten 'default surface' */
}

function _glBufferData(target, size, data, usage) {
if (!data) {
  GLctx.bufferData(target, size, usage);
} else {
  GLctx.bufferData(target, HEAPU8.subarray(data, data+size), usage);
}
}

function _glViewport(x0, x1, x2, x3) { GLctx['viewport'](x0, x1, x2, x3) }

function _eglMakeCurrent(display, draw, read, context) { 
if (display != 62000 /* Magic ID for Emscripten 'default display' */) {
  EGL.setErrorCode(0x3008 /* EGL_BAD_DISPLAY */);
  return 0 /* EGL_FALSE */;
}
//\todo An EGL_NOT_INITIALIZED error is generated if EGL is not initialized for dpy. 
if (context != 0 && context != 62004 /* Magic ID for Emscripten EGLContext */) {
  EGL.setErrorCode(0x3006 /* EGL_BAD_CONTEXT */);
  return 0;
}
if ((read != 0 && read != 62006) || (draw != 0 && draw != 62006 /* Magic ID for Emscripten 'default surface' */)) {
  EGL.setErrorCode(0x300D /* EGL_BAD_SURFACE */);
  return 0;
}
EGL.currentContext = context;
EGL.currentDrawSurface = draw;
EGL.currentReadSurface = read;
EGL.setErrorCode(0x3000 /* EGL_SUCCESS */);
return 1 /* EGL_TRUE */;
}

function _glBindAttribLocation(program, index, name) {
name = Pointer_stringify(name);
GLctx.bindAttribLocation(GL.programs[program], index, name);
}

function _gettimeofday(ptr) {
var now = Date.now();
HEAP32[((ptr)>>2)]=(now/1000)|0; // seconds
HEAP32[(((ptr)+(4))>>2)]=((now % 1000)*1000)|0; // microseconds
return 0;
}

function _eglInitialize(display, majorVersion, minorVersion) {
if (display == 62000 /* Magic ID for Emscripten 'default display' */) {
  if (majorVersion) {
    HEAP32[((majorVersion)>>2)]=1; // Advertise EGL Major version: '1'
  }
  if (minorVersion) {
    HEAP32[((minorVersion)>>2)]=4; // Advertise EGL Minor version: '4'
  }
  EGL.defaultDisplayInitialized = true;
  EGL.setErrorCode(0x3000 /* EGL_SUCCESS */);
  return 1;
} 
else {
  EGL.setErrorCode(0x3008 /* EGL_BAD_DISPLAY */);
  return 0;
}
}

function _XSendEvent(){}


function _eglGetConfigs(display, configs, config_size, numConfigs) { 
return EGL.chooseConfig(display, 0, configs, config_size, numConfigs);
}

function _glCreateShader(shaderType) {
var id = GL.getNewId(GL.shaders);
GL.shaders[id] = GLctx.createShader(shaderType);
return id;
}

function _XInternAtom(display, name_, hmm) { return 0 }

function _XSetWMHints(){}



function _glGetShaderiv(shader, pname, p) {
if (!p) {
  // GLES2 specification does not specify how to behave if p is a null pointer. Since calling this function does not make sense
  // if p == null, issue a GL error to notify user about it. 
  GL.recordError(0x0501 /* GL_INVALID_VALUE */);
  return;
}
if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
  var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
  if (log === null) log = '(unknown error)';
  HEAP32[((p)>>2)]=log.length + 1;
} else if (pname == 0x8B88) { // GL_SHADER_SOURCE_LENGTH
  var source = GLctx.getShaderSource(GL.shaders[shader]);
  var sourceLength = (source === null || source.length == 0) ? 0 : source.length + 1;
  HEAP32[((p)>>2)]=sourceLength;
} else {
  HEAP32[((p)>>2)]=GLctx.getShaderParameter(GL.shaders[shader], pname);
}
}

function _XCreateWindow(display, parent, x, y, width, height, border_width, depth, class_, visual, valuemask, attributes) {
// All we can do is set the width and height
Browser.setCanvasSize(width, height);
return 2;
}
var GLctx; GL.init();
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) { Module.printErr("Module.requestFullScreen is deprecated. Please call Module.requestFullscreen instead."); Module["requestFullScreen"] = Module["requestFullscreen"]; Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice) };
Module["requestFullscreen"] = function Module_requestFullscreen(lockPointer, resizeCanvas, vrDevice) { Browser.requestFullscreen(lockPointer, resizeCanvas, vrDevice) };
Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) { return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes) };
if (typeof dateNow !== 'undefined') {
_emscripten_get_now = dateNow;
} else if (typeof self === 'object' && self['performance'] && typeof self['performance']['now'] === 'function') {
_emscripten_get_now = function() { return self['performance']['now'](); };
} else if (typeof performance === 'object' && typeof performance['now'] === 'function') {
_emscripten_get_now = function() { return performance['now'](); };
} else {
_emscripten_get_now = Date.now;
};

Object.assign(Module.asmLibraryArg, {"_glUseProgram": _glUseProgram, "_eglGetDisplay": _eglGetDisplay, "_glDeleteShader": _glDeleteShader, "_glVertexAttribPointer": _glVertexAttribPointer, "_glGetProgramiv": _glGetProgramiv, "_abort": _abort, "_eglChooseConfig": _eglChooseConfig, "_glDrawArrays": _glDrawArrays, "_glGetProgramInfoLog": _glGetProgramInfoLog, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_glDeleteProgram": _glDeleteProgram, "_XCreateWindow": _XCreateWindow, "_glLinkProgram": _glLinkProgram, "_glCreateProgram": _glCreateProgram, "_glViewport": _glViewport, "_XInternAtom": _XInternAtom, "_glClearColor": _glClearColor, "_eglSwapBuffers": _eglSwapBuffers, "_glClear": _glClear, "_glutCreateWindow": _glutCreateWindow, "_XOpenDisplay": _XOpenDisplay, "_glGetShaderInfoLog": _glGetShaderInfoLog, "_eglCreateContext": _eglCreateContext, "_glBindAttribLocation": _glBindAttribLocation, "_glCreateShader": _glCreateShader, "_glShaderSource": _glShaderSource, "_eglInitialize": _eglInitialize, "_XMapWindow": _XMapWindow, "_XStoreName": _XStoreName, "_eglCreateWindowSurface": _eglCreateWindowSurface, "___unlock": ___unlock, "_glBindBuffer": _glBindBuffer, "_emscripten_set_main_loop": _emscripten_set_main_loop, "_eglWaitClient": _eglWaitClient, "_emscripten_get_now": _emscripten_get_now, "_glGenBuffers": _glGenBuffers, "_glAttachShader": _glAttachShader, "_eglGetConfigs": _eglGetConfigs, "_eglMakeCurrent": _eglMakeCurrent, "_glCompileShader": _glCompileShader, "_glEnableVertexAttribArray": _glEnableVertexAttribArray, "___lock": ___lock, "_glutInitDisplayMode": _glutInitDisplayMode, "_XChangeWindowAttributes": _XChangeWindowAttributes, "_XSetWMHints": _XSetWMHints, "_gettimeofday": _gettimeofday, "_glBufferData": _glBufferData, "_glGetShaderiv": _glGetShaderiv, "_XSendEvent": _XSendEvent});

}
