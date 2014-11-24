node-browserfs
==============

AMD module providing a node fs-like browser in-memory file system. Synchronous & async versions available for all functions.

API
---

http://nodejs.org/api/fs.html

+ + rmrf [rimraf](https://www.npmjs.org/package/rimraf)
+ + [mkdirp](https://www.npmjs.org/package/mkdirp) 
+ + [join([path1], [path2], [...])](http://nodejs.org/api/path.html#path_path_join_path1_path2)
+ + parse(path) -> [path1, path2, ...]

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

// async example Asynchronous readdir(3) [see node js fs api](http://nodejs.org/api/fs.html#fs_fs_readdir_path_callback)
fs.readdirSync('/', function (err, files) {
  ...
});
```

Test
----

```
$ mocha
```
