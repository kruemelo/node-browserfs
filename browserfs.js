define('browserfs', function () {
    /* String.trim() Polyfill
	Running the following code before any other code will create String.trim if it's not natively available.
	*/
    if (!String.prototype.trim) {
        (function () {
            // Make sure we trim BOM and NBSP
            var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
            String.prototype.trim = function () {
                return this.replace(rtrim, "");
            }
        })();
    }
    var BrowserFS = function () {
        var time = Date.now();
        this.root = {
            mtime: time,
            ctime: time,
            atime: time,
            data: {}
        };
    };

    function trueFn() {
        return true;
    }

    function falseFn() {
        return false;
    }

    function isDirectory (node) {
        return !!(node && node.data instanceof Object && !isFile(node));
    }

    function isFile (node) {
        return !!(node && node.data instanceof ArrayBuffer);
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

    BrowserFS.prototype.join = function () {
        var path = [],
            parts = arguments || [];
        path = this.parse(Array.prototype.slice.call(parts).join('/'));
        return ('/' === parts[0][0] ? '/' : '') + path.join('/');
    };

    BrowserFS.prototype.parse = function (_path) {
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

		// human readable file size SI: kB,MB,GB,TB,PB,EB,ZB,YB
		BrowserFS.prototype.fileSizeSI = function (a,b,c,d,e){
		 return (b=Math,c=b.log,d=1e3,e=c(a)/c(d)|0,a/b.pow(d,e)).toFixed(e?2:0)
		 	+' '+(e?'kMGTPEZY'[--e]+'B':'Bytes');
		};


		// human readable file size IEC: KiB,MiB,GiB,TiB,PiB,EiB,ZiB,YiB
		BrowserFS.prototype.fileSizeIEC = function (a,b,c,d,e){
		 return (b=Math,c=b.log,d=1024,e=c(a)/c(d)|0,a/b.pow(d,e)).toFixed(e?2:0)
		 	+' '+(e?'KMGTPEZY'[--e]+'iB':'Bytes');
		};

    BrowserFS.prototype.statSync = function (_path) {
        var path = this.parse(_path),
            node = find(path, this.root),
            isDir = isDirectory(node);
        if (!node || !node.data) {
            throw new Error('ENOENT');
        }
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
        var path = this.parse(_path),
            i,
            to = path.length,
            node = this.root;
        for (i = 0; i < to; ++i) {
            if (!isDirectory(node)) {
                return false;
            }
            node = node.data[path[i]];
        }
        return !!node;
    };

    BrowserFS.prototype.mkdirSync = function (_path) {
        var path = this.parse(_path),
            parentDir = find(path.slice(0, path.length - 1), this.root),
            time = Date.now();
        if (!path.length || !isDirectory(parentDir)) {
            throw new Error('ENODIR');
        }
        parentDir.data[path[path.length - 1]] = {
            data: {},
            ctime: time,
            mtime: time,
            atime: time,
        };
        parentDir.mtime = time;
    };

    BrowserFS.prototype.mkdirpSync = function (_path) {
        var path = this.parse(_path),
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
    };

    BrowserFS.prototype.readdirSync = function (_path) {
        var path = this.parse(_path),
            dir = find(path, this.root);
        if (!isDirectory(dir)) {
            throw new Error('ENODIR');
        }
        dir.atime = Date.now();
        return Object.keys(dir.data);
    };

    BrowserFS.prototype.rmdirSync = function (_path) {
        var path = this.parse(_path),
            dir = find(path, this.root)
            dirname = path.pop(),
            parentDir = find(path, this.root);
        // console.log(_path, path, dir, dirname, parentDir);
        if (!isDirectory(dir)) {
            throw new Error('ENODIR');
        }
        if (Object.keys(dir.data).length) {
            throw new Error('ENOTEMPTY');
        }
        delete parentDir.data[dirname];
        parentDir.mtime = Date.now();
    };

    BrowserFS.prototype.rmrfSync = function (_path) {
        var path = this.parse(_path),
            dirname = path.pop(),
            parentDir = find(path, this.root);
        if (!isDirectory(parentDir)) {
            throw new Error('ENODIR');
        }
        if (dirname) {
            delete parentDir.data[dirname];
        } else {
            parentDir.data = {}
        }
        parentDir.mtime = Date.now();
    };

    BrowserFS.prototype.writeFileSync = function (_path, content, options) {
        var path = this.parse(_path),
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
        options = options || {
            encoding: true
        };
        if ('string' === typeof content) {
            // convert into ArrayBuffer
            buffer = new ArrayBuffer(content.length * 2); // 2 bytes for each char
            var bufferView = new Uint16Array(buffer);
            for (var i = 0, strLen = content.length; i < strLen; ++i) {
                bufferView[i] = content.charCodeAt(i);
            }
        } else {
            buffer = content;
        }
        time = Date.now();
        parentDir.data[filename] = {
            data: buffer,
            ctime: time,
            mtime: time,
            atime: time,
        };
        if (!exists) {
            parentDir.mtime = time;
        }
        parentDir.atime = time;
    };

    /**
     * If no encoding is specified, then the raw buffer is returned.
     **/
    BrowserFS.prototype.readFileSync = function (_path, options) {
        var path = this.parse(_path),
            file = find(path, this.root),
            options = options || {
                encoding: false
            };
        if (!isFile(file)) {
            throw new Error('ENOENT');
        }
        file.atime = Date.now();
        return options.encoding ? String.fromCharCode.apply(null, new Uint16Array(file.data)) : file.data;
    };

    // async functions
    ['stat', 'exists', 'readdir', 'mkdirp', 'mkdir', 'rmdir', 'rmrf', 'unlink'].forEach(function (fn) {
        BrowserFS.prototype[fn] = function (path, callback) {
            try {
                var result = this[fn + "Sync"](path);
            } catch (e) {
                return callback(e);
            }
            return callback(null, result);
        };
    });

    ['writeFile', 'readFile'].forEach(function (fn) {
        BrowserFS.prototype[fn] = function (path, optArg, callback) {
            if (!callback) {
                callback = optArg;
                optArg = undefined;
            }
            try {
                var result = this[fn + "Sync"](path, optArg);
            } catch (e) {
                return callback(e);
            }
            return callback(null, result);
        };
    });

    return BrowserFS;
});