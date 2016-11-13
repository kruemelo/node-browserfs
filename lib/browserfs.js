
var Buffer = require('buffer').Buffer;
var path = require('path');

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
BrowserFS.path = path;

// https://nodejs.org/docs/latest-v5.x/api/fs.html#fs_fs_access_path_mode_callback
BrowserFS.F_OK = 0;
BrowserFS.X_OK = 1;
BrowserFS.W_OK = 2;
BrowserFS.R_OK = 4;


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

function find (pathParts, rootNode) {
  var i,
    to = pathParts.length,
    node = rootNode;
  for (i = 0; i < to; ++i) {
    if (!isDirectory(node)) {
      throw new Error('ENOENT');
    }
    node = node.data[pathParts[i]];
  }
  return node;
}


BrowserFS.prototype.getNode = function (filename) {
  return find(this.parsePathParts(filename), this.root);
};


BrowserFS.prototype.parsePathParts = function (pathname) {
  var pathParts = [];
  pathname = path.normalize(pathname || '/');
  pathname.split(/\/+/).forEach(function (term) {
    term = term.trim();
    if (term.length && '.' !== term) {
      if ('..' === term) {
        pathParts.pop();
      } else {
        pathParts.push(term);
      }
    }
  });
  return pathParts;
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


BrowserFS.prototype.statSync = function (filename) {

  var pathParts = this.parsePathParts(filename),
    node = find(pathParts, this.root),
    isDir = isDirectory(node);

  if (!node || !node.data) {
    throw new Error('ENOENT');
  }

  this.fnDone('stat', filename);

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


// https://nodejs.org/docs/latest-v5.x/api/fs.html#fs_fs_access_path_mode_callback
BrowserFS.prototype.accessSync = function (filename, mode) {

  var pathParts = this.parsePathParts(filename),
    i,
    to = pathParts.length,
    node = this.root;

  for (i = 0; i < to; ++i) {
    if (!isDirectory(node)) {

      this.fnDone('access', filename, mode, false);
      
      throw new Error('ENOENT');
    }
    node = node.data[pathParts[i]];
  }
  
  this.fnDone('access', filename, mode, !node);

  if (!node) {
    throw new Error('ENOENT');
  }

  return true;
};


BrowserFS.prototype.existsSync = function (filename) {

  var pathParts = this.parsePathParts(filename),
    i,
    to = pathParts.length,
    node = this.root;

  for (i = 0; i < to; ++i) {
    if (!isDirectory(node)) {
      this.fnDone('exists', filename);
      return false;
    }
    node = node.data[pathParts[i]];
  }
  
  this.fnDone('exists', filename);

  return !!node;
};


BrowserFS.prototype.mkdirSync = function (pathname) {

  var pathParts = this.parsePathParts(pathname),
    parentDir = find(pathParts.slice(0, pathParts.length - 1), this.root),
    time = Date.now(),
    dirBasename;

  if (!pathParts.length || !isDirectory(parentDir)) {
    throw new Error('ENODIR');
  }

  dirBasename = pathParts[pathParts.length - 1];

  if (!parentDir.data[dirBasename]) {
    
    parentDir.data[dirBasename] = {
      data: {},
      ctime: time,
      mtime: time,
      atime: time,
    };

    parentDir.mtime = time;
  }

  this.fnDone('mkdir', pathname);

  return this;
};


BrowserFS.prototype.mkdirpSync = function (pathname) {

  var pathParts = this.parsePathParts(pathname),
    pathLength = pathParts.length,
    tmpPath,
    i,
    dir;

  if (!pathParts.length) {
    throw new Error('ENODIR');
  }
  for (i = 0; i < pathLength; ++i) {
    tmpPath = pathParts.slice(0, i + 1);
    dir = find(tmpPath, this.root);
    if (isFile(dir)) {
      throw new Error('ENODIR');
    }
    if (!isDirectory(dir)) {
      this.mkdirSync(tmpPath.join('/'));
    }
  }

  this.fnDone('mkdirp', pathname);

  return this;
};


BrowserFS.prototype.readdirSync = function (pathname) {

  var pathParts = this.parsePathParts(pathname),
    dir = find(pathParts, this.root);

  if (!isDirectory(dir)) {
    throw new Error('ENODIR');
  }
  
  dir.atime = Date.now();

  this.fnDone('readdir', pathname);
  
  return Object.keys(dir.data);
};


BrowserFS.prototype.rmdirSync = function (pathname) {

  var pathParts = this.parsePathParts(pathname),
    dir = find(pathParts, this.root),
    dirname = pathParts.pop(),
    parentDir = find(pathParts, this.root);

  if (!isDirectory(dir)) {
    throw new Error('ENODIR');
  }

  if (Object.keys(dir.data).length) {
    throw new Error('ENOTEMPTY');
  }

  delete parentDir.data[dirname];

  parentDir.mtime = Date.now();

  this.fnDone('rmdir', pathname);

  return this;
};


BrowserFS.prototype.unlinkSync = function (filename) {

  var dirname = path.dirname(filename),
    basename = path.basename(filename),
    parentDir = find(this.parsePathParts(dirname), this.root);

  delete parentDir.data[basename];

  parentDir.mtime = Date.now();

  this.fnDone('unlink', filename);

  return this;
};


BrowserFS.prototype.rmrfSync = function (pathname) {

  var pathParts = this.parsePathParts(pathname),
    dirname = pathParts.pop(),
    parentDir = find(pathParts, this.root);

  if (!isDirectory(parentDir)) {
    throw new Error('ENODIR');
  }

  if (dirname) {
    delete parentDir.data[dirname];
  } else {
    parentDir.data = {};
  }

  parentDir.mtime = Date.now();

  this.fnDone('rmrf', pathname);

  return this;
};


/*
  ### writeFileSync(filename, content[, options])

  filename string

  content null|string|Buffer|ArrayBuffer
  
  options: null|string|object

  options.encoding: null (default), 'utf8', 'utf16le', 'utf16be' 
*/
BrowserFS.prototype.writeFileSync = function (filename, content, options) {

  var pathParts = this.parsePathParts(filename),
    basename = pathParts.pop(),
    exists = this.existsSync(filename),
    parentDir = find(pathParts, this.root),
    buffer, time;

  if (!isDirectory(parentDir)) {
    throw new Error('ENODIR');
  }

  if (!basename) {
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
    parentDir.data[basename].data = buffer;
    parentDir.data[basename].atime = time;
    parentDir.data[basename].mtime = time;
  }
  else {
    // create file
    parentDir.data[basename] = {
      data: buffer,
      ctime: time,
      mtime: time,
      atime: time,
      isFile: true
    };
    parentDir.mtime = time;
  }

  parentDir.atime = time;

  this.fnDone('writeFile', filename);

  return this;
};


/*
  ### readFileSync (filename[, options])

  options: null|string|object

  options.encoding: null (default), 'utf8', 'utf16le', 'utf16be' 
  
  If no encoding is specified, then the raw buffer is returned.

  If data written withe writeFile() was instance of ArrayBuffer, readFile() will also return ArrayBuffer unless a string encoding option was set.

*/
BrowserFS.prototype.readFileSync = function (filename, options) {

  var pathParts = this.parsePathParts(filename),
    file = find(pathParts, this.root);

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

  this.fnDone('readFile', filename);

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


BrowserFS.prototype.renameSync = function (oldPathname, newPathname) {

  var oldPath = this.parsePathParts(oldPathname),
    oldNode = find(oldPath, this.root),
    oldParentDir = find(oldPath.slice(0, oldPath.length - 1), this.root),
    oldFilename = oldPath[oldPath.length - 1],
    newPath = this.parsePathParts(newPathname),
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

  this.fnDone('rename', {oldPath: oldPathname, newPath: newPathname});

  return this;
};

// async functions, one argument plus callback without err
['exists'].forEach(function (fn) {
  BrowserFS.prototype[fn] = function (filename, callback) {
    return callback(this[fn + "Sync"](filename));
  };
});

// async functions, one argument plus callback
['stat', 'readdir', 'mkdirp', 'mkdir', 'rmdir', 'rmrf', 'unlink'].forEach(function (fn) {
  BrowserFS.prototype[fn] = function (filename, callback) {
    var result;
    try {
      result = this[fn + "Sync"](filename);
    } catch (e) {
      return callback(e);
    }
    return callback(null, result);
  };
});

// async functions, optional second argument plus callback
['readFile', 'access'].forEach(function (fn) {
  BrowserFS.prototype[fn] = function (filename, optArg, callback) {
    var result;
    if (!callback) {
      callback = optArg;
      optArg = undefined;
    }
    try {
      result = this[fn + "Sync"](filename, optArg);
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