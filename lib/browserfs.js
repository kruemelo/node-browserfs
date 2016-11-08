
var Buffer = require('buffer').Buffer;

var BrowserFS = function (fnDone) {
  
  var time = Date.now();

  this.root = {
    mtime: time,
    ctime: time,
    atime: time,
    data: {}
  };

  this.fnDone = function () {
    var doneArgs = arguments;
    
    if ('function' === typeof fnDone) {
      setTimeout(function () {
        fnDone.apply(null, doneArgs);
      }, 0);
    }
  };
};

BrowserFS.Buffer = Buffer;

function trueFn() {
  return true;
}

function falseFn() {
  return false;
}

function isDirectory (node) {
  return !!(node && !node.isFile && node.data instanceof Object);
}

function isFile (node) {
  return !!(node && node.isFile);
}

function find (path, rootNode) {
  var i,
    to = path.length,
    node = rootNode;
  for (i = 0; i < to; ++i) {
    if (!isDirectory(node)) {
      throw new Error('ENOENT');
    }
    node = node.data[path[i]];
  }
  return node;
}

// optional encodings: 'utf8' (default), 'utf16le', 'utf16be' 
// (https://encoding.spec.whatwg.org/#the-encoding)
// BrowserFS.prototype.arrayBufferToString = function (buffer, encoding) {
//   if ('undefined' === typeof TextDecoder) {
//     return String.fromCharCode.apply(null, new Uint16Array(buffer));            
//   }
//   encoding = encodings[encoding] || 'utf8';
//   return (new TextDecoder(encoding)).decode(new DataView(buffer));
// };

// // optional encodings: 'utf8', 'utf16le', 'utf16be'
// BrowserFS.prototype.stringToArrayBuffer = function (str, encoding) {
  
//   var buffer;

//   encoding = encodings[encoding] || 'utf8';
  
//   if ('undefined' === typeof TextEncoder) {
//     buffer = new ArrayBuffer(str.length * 2); // 2 bytes for each char
//     var bufferView = new Uint16Array(buffer);
//     for (var i = 0, strLen = str.length; i < strLen; ++i) {
//       bufferView[i] = str.charCodeAt(i);
//     }
//   }
//   else {
//     buffer = (new TextEncoder(encoding)).encode(str).buffer;
//   }        

//   return buffer;
// };


BrowserFS.prototype.getNode = function (filename) {
  return find(this.parsePath(filename), this.root);
};

BrowserFS.prototype.joinPath = function () {
  var path = [],
    parts = arguments || [];
  path = this.parsePath(Array.prototype.slice.call(parts).join('/'));
  return ('/' === parts[0][0] ? '/' : '') + path.join('/');
};

BrowserFS.prototype.parsePath = function (_path) {
  var path = [];
  _path = _path || '/';
  _path.split(/\/+/).forEach(function (term) {
    term = term.trim();
    if (term.length && '.' !== term) {
      if ('..' === term) {
        path.pop();
      } else {
        path.push(term);
      }
    }
  });
  return path;
};

BrowserFS.prototype.normalizePath = function (path) {
  return '/' + this.parsePath(path).join('/');
};

BrowserFS.prototype.dirname = function (path) {

  var pathParts = this.parsePath(path);

  pathParts = pathParts.slice(0, pathParts.length - 1);
  return '/' + pathParts.join('/');
};    

BrowserFS.prototype.basename = function (filename) {
  var pathParts = this.parsePath(filename);
  return pathParts.length ? pathParts.pop() : '';
};    

// human readable file size SI: kB,MB,GB,TB,PB,EB,ZB,YB
BrowserFS.prototype.fileSizeSI = function (a, b, c, d, e){
 return (b = Math, c= b.log, d = 1e3, e = c(a) / c(d) |0 , a/b.pow(d,e)).toFixed(e ? 2 : 0)
  + ' ' + (e ? 'kMGTPEZY' [--e] + 'B' : 'Bytes');
};


// human readable file size IEC: KiB,MiB,GiB,TiB,PiB,EiB,ZiB,YiB
BrowserFS.prototype.fileSizeIEC = function (a, b, c, d, e){
 return (b = Math, c = b.log, d=1024, e= c(a) / c(d) | 0, a/b.pow(d,e)).toFixed(e ? 2 : 0)
  + ' ' + (e ? 'KMGTPEZY' [--e] + 'iB' : 'Bytes');
};


BrowserFS.prototype.statSync = function (_path) {

  var path = this.parsePath(_path),
    node = find(path, this.root),
    isDir = isDirectory(node);

  if (!node || !node.data) {
    throw new Error('ENOENT');
  }

  this.fnDone('stat', _path);

  return {
    size: isDir ? Object.keys(node.data).length : node.data.byteLength,
    ctime: new Date(node.ctime),
    mtime: new Date(node.mtime),
    atime: new Date(node.atime),
    isFile: function () {
      return !isDir;
    },
    isDirectory: function () {
      return isDir;
    },
    isBlockDevice: falseFn,
    isCharacterDevice: falseFn,
    isSymbolicLink: falseFn,
    isFIFO: falseFn,
    isSocket: falseFn
  };
};


BrowserFS.prototype.existsSync = function (_path) {

  var path = this.parsePath(_path),
    i,
    to = path.length,
    node = this.root;

  for (i = 0; i < to; ++i) {
    if (!isDirectory(node)) {
      this.fnDone('exists', _path);
      return false;
    }
    node = node.data[path[i]];
  }
  
  this.fnDone('exists', _path);

  return !!node;
};


BrowserFS.prototype.mkdirSync = function (_path) {

  var path = this.parsePath(_path),
    parentDir = find(path.slice(0, path.length - 1), this.root),
    time = Date.now(),
    dirBasename;

  if (!path.length || !isDirectory(parentDir)) {
    throw new Error('ENODIR');
  }

  dirBasename = path[path.length - 1];

  if (!parentDir.data[dirBasename]) {
    
    parentDir.data[dirBasename] = {
      data: {},
      ctime: time,
      mtime: time,
      atime: time,
    };

    parentDir.mtime = time;
  }

  this.fnDone('mkdir', _path);

  return this;
};


BrowserFS.prototype.mkdirpSync = function (_path) {

  var path = this.parsePath(_path),
    pathLength = path.length,
    tmpPath,
    i,
    dir;

  if (!path.length) {
    throw new Error('ENODIR');
  }
  for (i = 0; i < pathLength; ++i) {
    tmpPath = path.slice(0, i + 1);
    dir = find(tmpPath, this.root);
    if (isFile(dir)) {
      throw new Error('ENODIR');
    }
    if (!isDirectory(dir)) {
      this.mkdirSync(tmpPath.join('/'));
    }
  }

  this.fnDone('mkdirp', _path);

  return this;
};


BrowserFS.prototype.readdirSync = function (_path) {

  var path = this.parsePath(_path),
    dir = find(path, this.root);

  if (!isDirectory(dir)) {
    throw new Error('ENODIR');
  }
  
  dir.atime = Date.now();

  this.fnDone('readdir', _path);
  
  return Object.keys(dir.data);
};


BrowserFS.prototype.rmdirSync = function (_path) {

  var path = this.parsePath(_path),
    dir = find(path, this.root),
    dirname = path.pop(),
    parentDir = find(path, this.root);

  if (!isDirectory(dir)) {
    throw new Error('ENODIR');
  }

  if (Object.keys(dir.data).length) {
    throw new Error('ENOTEMPTY');
  }

  delete parentDir.data[dirname];

  parentDir.mtime = Date.now();

  this.fnDone('rmdir', _path);

  return this;
};


BrowserFS.prototype.unlinkSync = function (filename) {

  var dirname = this.dirname(filename),
    basename = this.basename(filename),
    parentDir = find(this.parsePath(dirname), this.root);

  delete parentDir.data[basename];

  parentDir.mtime = Date.now();

  this.fnDone('unlink', filename);

  return this;
};


BrowserFS.prototype.rmrfSync = function (_path) {

  var path = this.parsePath(_path),
    dirname = path.pop(),
    parentDir = find(path, this.root);

  if (!isDirectory(parentDir)) {
    throw new Error('ENODIR');
  }

  if (dirname) {
    delete parentDir.data[dirname];
  } else {
    parentDir.data = {};
  }

  parentDir.mtime = Date.now();

  this.fnDone('rmrf', _path);

  return this;
};


/*
  ### writeFileSync(filename, content[, options])

  filename string

  content null|string|Buffer|ArrayBuffer
  
  options: null|string|object

  options.encoding: null (default), 'utf8', 'utf16le', 'utf16be' 
*/
BrowserFS.prototype.writeFileSync = function (_path, content, options) {

  var path = this.parsePath(_path),
    filename = path.pop(),
    exists = this.existsSync(_path),
    parentDir = find(path, this.root),
    buffer, time;

  if (!isDirectory(parentDir)) {
    throw new Error('ENODIR');
  }

  if (!filename) {
    throw new Error('EINVALIDPATH');
  }

  if ('string' === typeof options) {
    options = {
      encoding: options
    };
  }

  options = options || {
    encoding: null
  };

  if ('string' === typeof content) {
    // convert into ArrayBuffer
    buffer = Buffer.from(content, options.encoding);
  } 
  else {
    buffer = content;
  }

  time = Date.now();

  if (exists) {
    // update file
    parentDir.data[filename].data = buffer;
    parentDir.data[filename].atime = time;
    parentDir.data[filename].mtime = time;
  }
  else {
    // create file
    parentDir.data[filename] = {
      data: buffer,
      ctime: time,
      mtime: time,
      atime: time,
      isFile: true
    };
    parentDir.mtime = time;
  }

  parentDir.atime = time;

  this.fnDone('writeFile', _path);

  return this;
};


/*
  ### readFileSync (filename[, options])

  options: null|string|object

  options.encoding: null (default), 'utf8', 'utf16le', 'utf16be' 
  
  If no encoding is specified, then the raw buffer is returned.

  If data written withe writeFile() was instance of ArrayBuffer, readFile() will also return ArrayBuffer unless a string encoding option was set.

*/
BrowserFS.prototype.readFileSync = function (_path, options) {

  var path = this.parsePath(_path),
    file = find(path, this.root);

  if ('string' === typeof options) {
    options = {
      encoding: options
    };
  }

  options = options || {
    encoding: null
  };

  if (!isFile(file)) {
    throw new Error('ENOENT');
  }

  file.atime = Date.now();

  this.fnDone('readFile', _path);

  if (options.encoding) {
    if (file.data instanceof ArrayBuffer) {
      return Buffer.from(file.data).toString(options.encoding);
    }
    else {
      return file.data.toString(options.encoding);
    }
  }
  else {
    return file.data;
  }
};


BrowserFS.prototype.renameSync = function (_oldPath, _newPath) {

  var oldPath = this.parsePath(_oldPath),
    oldNode = find(oldPath, this.root),
    oldParentDir = find(oldPath.slice(0, oldPath.length - 1), this.root),
    oldFilename = oldPath[oldPath.length - 1],
    newPath = this.parsePath(_newPath),
    newNode = find(newPath, this.root),
    newParentDir = find(newPath.slice(0, newPath.length - 1), this.root),
    newFilename = newPath[newPath.length - 1],
    time = Date.now();

  if (!oldPath.length || !newPath.length) {
    throw new Error('ENOENT');
  }

  if (!isDirectory(oldParentDir || !isDirectory(newParentDir))) {
    throw new Error('ENODIR');
  }

  if (newNode) {
    throw new Error('EEXISTS');
  }

  // new location ref
  newParentDir.data[newFilename] = newNode = oldNode;
  newNode.ctime = time;
  newParentDir.mtime = time;

  // delete old ref
  delete oldParentDir.data[oldFilename];
  oldParentDir.mtime = time;

  this.fnDone('rename', {oldPath: _oldPath, newPath: _newPath});

  return this;
};

// async functions, one argument plus callback without err
['exists'].forEach(function (fn) {
  BrowserFS.prototype[fn] = function (path, callback) {
    return callback(this[fn + "Sync"](path));
  };
});

// async functions, one argument plus callback
['stat', 'readdir', 'mkdirp', 'mkdir', 'rmdir', 'rmrf', 'unlink'].forEach(function (fn) {
  BrowserFS.prototype[fn] = function (path, callback) {
    var result;
    try {
      result = this[fn + "Sync"](path);
    } catch (e) {
      return callback(e);
    }
    return callback(null, result);
  };
});

// async functions, optional second argument plus callback
['readFile'].forEach(function (fn) {
  BrowserFS.prototype[fn] = function (path, optArg, callback) {
    var result;
    if (!callback) {
      callback = optArg;
      optArg = undefined;
    }
    try {
      result = this[fn + "Sync"](path, optArg);
    } catch (e) {
      return callback(e);
    }
    return callback(null, result);
  };
});

// async functions, required second argument plus callback
['rename'].forEach(function (fn) {
  BrowserFS.prototype[fn] = function (arg1, arg2, callback) {
    var result;
    try {
      result = this[fn + "Sync"](arg1, arg2);
    } catch (e) {
      return callback(e);
    }
    return callback(null, result);
  };
});

// async functions, optional third argument plus callback
['writeFile'].forEach(function (fn) {
  BrowserFS.prototype[fn] = function (arg1, arg2, optArg, callback) {
    var result;
    if (!callback) {
      callback = optArg;
      optArg = undefined;
    }
    try {
      result = this[fn + "Sync"](arg1, arg2, optArg);
    } catch (e) {
      return callback(e);
    }
    return callback(null, result);
  };
});

module.exports = BrowserFS;