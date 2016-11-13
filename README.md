node-browserfs
==============

a node fs-like browser in-memory file system. Synchronous & async versions available for all supported functions.

API
---

http://nodejs.org/api/fs.html

plus:
  * rmrf [rimraf](https://www.npmjs.org/package/rimraf)
  * [mkdirp](https://www.npmjs.org/package/mkdirp)
  * [join([path1], [path2], [...])](http://nodejs.org/api/path.html#path_path_join_path1_path2)
  * parsePathParts('/a/b/../c') -> ['a', 'c']
  * fileSizeSI / fileSizeIEC -> 34.30 kB / 33.50 KiB
  * [BrowserFS.Buffer](https://nodejs.org/docs/latest-v5.x/api/buffer.html)
  * [BrowserFS.path](https://nodejs.org/docs/latest-v5.x/api/path.html)

not supported:
  * watch, unwatch
  * stream
  * appendFile
  * chmod, chown
  * open, read, write, close
  * fsync
  * truncate
  * link, symlink
  * realpath


Use
---
```
var BrowserFS = requirejs('browserfs');
var fs = new BrowserFS();

fs.statSync('/');
fs.mkdirSync('/subdir');
fs.mkdirpSync('/subdir2/subdir3');
fs.existsSync('/subdir/subdir2');
fs.rmdirSync('/subdir/subdir2');
fs.rmrfSync('/subdir');
fs.writeFileSync('/file', 'file string content');
fs.writeFileSync('/file', buffer);


fs.stat('/file', function (err, stats) {
  // human readable file size:
  // SI: kB,MB,GB,TB,PB,EB,ZB,YB / IEC: KiB,MiB,GiB,TiB,PiB,EiB,ZiB,YiB
  console.log(fs.fileSizeSI(stats.size), fs.fileSizeIEC(stats.size));
  // -> 34.30 kB / 33.50 KiB
});

// async example Asynchronous readdir(3)
// see node js fs api http://nodejs.org/api/fs.html#fs_fs_readdir_path_callback
fs.readdir('/', function (err, files) {
  ...
});

// Asynchronous rename(2) / move directory (or file)
fs.rename('/subdir1/subdir1-1', '/subdir2/subdir2-1', function (err) {
  ...
});

// fs.access(path[, mode], callback)
fs.access('/path/to/file', function (err) {
  ...
});

// access to node path

BrowserFS.path.join(''/a/b', '../c');  // '/a/c'
BrowserFS.path.normalize('/a/b/..c');  // '/a/c'

// access to node Buffer
vart buf = BrowserFS.Buffer.from('tést', 'utf8'); 
buf.toString('utf8'); // 'tést'

```

Have a look at the example folder.

Open index.html in browser, drop the github timeout png, click on the filename to download..

Read the code.

Test
----

```
$ mocha
```

Build
-----

Prerequisites

+ `node -v` >= 5.12.0
+ `npm install browserify -g`

run `npm run build` will produce browserified version of `lib/browserfs.js` in main folder `browserfs.js' and minify to 'browserfs.min.js'


License
-------
[WTFPL](http://www.wtfpl.net/)
