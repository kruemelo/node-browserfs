// $ npm test
// $ mocha

var path = require('path');
var assert = require('chai').assert;
var util = require('util');

var BrowserFs = require('../lib/browserfs.js');

function trueFn() { return true }
function falseFn() { return false }


describe('browserfs', function () {

  it('ctor takes a done-callback function', function (done) {

    var browserfs;

    function doneCallback (fnName, data) {
      assert.strictEqual(fnName, 'stat');
      assert.strictEqual(data, '/');
      done();
    }

    browserfs = new BrowserFs(doneCallback);

    browserfs.statSync('/');

  });


  it('should expose node Buffer', function () {

    // https://nodejs.org/docs/latest-v5.x/api/buffer.html#buffer_buffers_and_character_encodings

    const str = 'tést';
    const arrayBuffer = Uint8Array.from([1,2,4]).buffer;
    
    var buf = BrowserFs.Buffer.from(str, 'utf8');

    assert.instanceOf(buf, Buffer);

    // to utf8
    assert.strictEqual(buf.toString('utf8'), str);

    // to utf16le
    assert.strictEqual(buf.toString('utf16le'), '썴玩');

    // to base64
    assert.strictEqual(buf.toString('base64'), 'dMOpc3Q=');

    buf = BrowserFs.Buffer.from(arrayBuffer);

    assert.deepEqual(buf.buffer, arrayBuffer);

    // to ArrayBuffer
    assert.instanceOf(buf.buffer, ArrayBuffer);

  });

});

describe('paths', function () {

  it('should parse paths to array', function (done) {

    var fs = new BrowserFs();

    [
      ['', []],
      ['/', []],
      ['/a', ['a']],
      ['/a/', ['a']],
      ['/a/b', ['a', 'b']],
      ['/a/b/../c', ['a', 'c']],
      ['/a/../', []],
      ['/a/../..', []]
    ].forEach(function (test) {
      var result = fs.parsePathParts(test[0]);
      assert.deepEqual(result, test[1], util.format('result: "%s", expected: "%s"', result, test[1]));
    });

    done();
  });

});


describe('stats', function () {


  it('should have stats for root node', function () {

    var fs = new BrowserFs(),
      result = fs.statSync('/');

    assert.strictEqual(result.isFile(), false);
    assert.strictEqual(result.isDirectory(), true);
    assert.strictEqual(result.isBlockDevice(), false);
    assert.strictEqual(result.isCharacterDevice(), false);
    assert.strictEqual(result.isSymbolicLink(), false);
    assert.strictEqual(result.isFIFO(), false);
    assert.strictEqual(result.isSocket(), false);   
    assert.strictEqual(result.size, 0);

  });


  it('should throw error for non existing files', function () {
      assert.throw(
        function () {
          var fs = new BrowserFs();
          fs.statSync('/unknown/path');
        },
        Error,
        'ENOENT'
      );
  });

});


describe('exists', function () {


  it('should test for existing directory', function () {

      var fs = new BrowserFs();

      assert(fs.existsSync());
      assert(fs.existsSync(''));
      assert(fs.existsSync('/'));
      assert(!fs.existsSync('/not existing directory'));

      fs.mkdirSync('/subdir');
      assert(fs.existsSync('/subdir'));

      fs.mkdirSync('/subdir/subdir2');
      assert(fs.existsSync('/subdir/subdir2'));

      assert(!fs.existsSync('/subdir/subdir2/not existing directory'));
  });


});


describe('file nodes', function () {

  it('should have a function to get file nodes', function () {
    
    var fs = new BrowserFs();
    
    assert.isFunction(fs.getNode, 'get node');
    assert.isObject(fs.getNode('/'), 'root node');
  });

  it('should get directory nodes', function () {

    var fs = new BrowserFs();

    fs.mkdirpSync('/dirA/dirB');

    node = fs.getNode('/dirA');
    assert.property(node, 'data');
    assert.property(node, 'ctime');

    node = fs.getNode('/dirA/dirB');
    assert.property(node, 'data');
    assert.property(node, 'ctime');
  });

  it('should get file nodes', function () {

    var fs = new BrowserFs(),
      node;

    fs.writeFileSync('/file0', 'file0 content');
    fs.mkdirpSync('/dirA');    
    fs.writeFileSync('/dirA/file1', 'file1 content');

    node = fs.getNode('/file0');
    assert.property(node, 'data');
    assert.property(node, 'ctime');

    node = fs.getNode('/dirA/file1');
    assert.property(node, 'data');
    assert.property(node, 'ctime');
  });

});


describe("directory", function () {


  it("should have a empty root directory as startup", function (done) {

    var fs = new BrowserFs();

    assert(fs.readdirSync('/'), []);

    fs.readdir("/", function (err, files) {
      if(err) throw err;
      assert(files, []);
      done();
    });

  });


  it('should create a directory', function () {

    var fs = new BrowserFs();

    fs.mkdirSync('/subdir');
    assert.deepEqual(fs.readdirSync('/'), ['subdir']);

    fs.mkdirSync('/subdir2');
    assert.deepEqual(fs.readdirSync('/'), ['subdir', 'subdir2']);

    fs.mkdirSync('/subdir2/subdir3');
    assert.deepEqual(fs.readdirSync('/subdir2'), ['subdir3']);

    assert.throw(
      function () {
        fs.mkdirSync('/');
      },
      Error,
      'ENODIR'
    );

  });

  it('should not recreate an existing directory', function () {

    var fs = new BrowserFs();

    fs.mkdirpSync('/dir/subdir');
    assert.deepEqual(fs.readdirSync('/dir'), ['subdir']);

    fs.mkdirSync('/dir');
    assert.deepEqual(fs.readdirSync('/dir'), ['subdir']);
  });


  it('should create directories -p', function () {

    var fs = new BrowserFs();

    fs.mkdirpSync('/subdir/subdir2');
    assert.deepEqual(fs.readdirSync('/'), ['subdir']);
    assert.deepEqual(fs.readdirSync('/subdir'), ['subdir2']);

    assert.throw(
      function () {
        fs.mkdirpSync('/');
      },
      Error,
      'ENODIR'
    );

  });


  it('should not remove a non-empty directory', function () {

    var fs = new BrowserFs();
    fs.mkdirpSync('/subdir/subdir2');

    assert.throw(
      function () {
        fs.rmdirSync('/subdir');
      },
      Error,
      'ENOTEMPTY'
    );
  });


  it('should remove a directory', function () {

    var fs = new BrowserFs();
    fs.mkdirpSync('/subdir/subdir2');
    fs.rmdirSync('/subdir/subdir2');
    assert(!fs.existsSync('/subdir/subdir2'));

  });


  it('should remove a non-empty directory', function () {
    var fs = new BrowserFs();
    fs.mkdirpSync('/subdir/subdir2');
    fs.rmrfSync('/subdir');
    assert(!fs.existsSync('/subdir'));
    assert(!fs.existsSync('/subdir/subdir2'));

    fs.mkdirpSync('/subdir3');
    fs.rmrfSync('/');
    assert(!fs.existsSync('/subdir3'));
    assert(fs.existsSync('/'));
  });


  it('should rename a directory', function (done) {

    var fs = new BrowserFs(),
      subdir1StatsBefore,
      subdir1_1Stats,
      subdir2StatsBefore;

    fs.mkdirpSync('/subdir1/subdir1-1');
    fs.mkdirSync('/subdir2');
    fs.writeFileSync('/subdir1/subdir1-1/a_file.txt', 'file string content');

    subdir1StatsBefore = fs.statSync('/subdir1');
    subdir1_1Stats = fs.statSync('/subdir1/subdir1-1');
    subdir2StatsBefore = fs.statSync('/subdir2');

    // test: rename (/move) subdir1/subdir1-1 to subdir2/subdir2-1
    setTimeout(function () {
      fs.rename('/subdir1/subdir1-1', '/subdir2/subdir2-1', function (err) {

        var subdir1StatsAfter, subdir2_1Stats, subdir2StatsAfter;

        assert(!fs.existsSync('/subdir1/subdir1-1'), 'original directory should not exist');
        assert(fs.existsSync('/subdir2/subdir2-1'), 'renamed directory should exist');
        assert(fs.existsSync('/subdir2/subdir2-1/a_file.txt'), 'directory contents should exist')

        subdir1StatsAfter = fs.statSync('/subdir1');
        subdir2_1Stats = fs.statSync('/subdir2/subdir2-1');
        subdir2StatsAfter = fs.statSync('/subdir2');

        assert(subdir1StatsAfter.mtime > subdir1StatsBefore.mtime, 'old parent directory mtime should be greater than before');
        assert(subdir2_1Stats.ctime > subdir1_1Stats.ctime, 'renamed directorie\'s stats ctime should be greater than before');
        assert.equal(subdir2_1Stats.mtime.getTime(), subdir1_1Stats.mtime.getTime(), 'renamed directories stats mtime should be equal');
        assert(subdir2StatsAfter.mtime > subdir2StatsBefore.mtime, 'new parent directory mtime should be greater than before');

        done();
      });
    }, 1);

  });


  it('should access directory', function () {

    var fs = new BrowserFs();
    
    fs.mkdirSync('access-dir', 'content');

    assert.throw(
      function () {
        fs.accessSync('no-access-dir', BrowserFs.F_OK);
      },
      Error,
      'ENOENT'
    );

    assert.throw(
      function () {
        fs.accessSync('no-dir/access-dir');
      },
      Error,
      'ENOENT'
    );

    assert.isTrue(fs.accessSync('access-dir'));

  });

}); // describe directory


describe('files', function () {


  it('should create a file', function () {

    var fs = new BrowserFs();

    assert(!fs.existsSync('/file'));
    fs.writeFileSync('/file', '');
    assert(fs.existsSync('/file'));
  });


  it('should write string to file', function () {
    var fs = new BrowserFs();

    fs.writeFileSync('/file', 'file string content');
    assert(fs.existsSync('/file'));
  });


  it('should write to file async', function (done) {
    var fs = new BrowserFs();

    fs.writeFile('/file-async', 'file string content', function (err) {
      assert(!err);
      assert(fs.existsSync('/file-async'));
      done();
    });
  });


  it('should write to file async with options', function (done) {
    var fs = new BrowserFs();

    fs.writeFile('/file-async-options', 'file string content', 'utf8', function (err) {
      assert(!err);
      assert(fs.existsSync('/file-async-options'));
      done();
    });
  });


  it('should read buffer from file by default', function () {

    var fs = new BrowserFs();
    fs.writeFileSync('/file', 'file string content');
    assert.instanceOf(
      fs.readFileSync('/file'),
      Buffer, 
      'file content as buffer'
    );

  });


  it('should read and write ArrayBuffer', function () {

    var fs = new BrowserFs(),
      contentStr = 'file string còntént',
      buffer = BrowserFs.Buffer.from(contentStr),
      arrayBuffer = new Int8Array(buffer).buffer;

    assert.strictEqual(buffer.length, 21);

    assert.instanceOf(arrayBuffer, ArrayBuffer);

    assert.strictEqual(arrayBuffer.byteLength, 21);

    fs.writeFileSync('/file', arrayBuffer);

    assert.instanceOf(
      fs.readFileSync('/file'),
      ArrayBuffer, 
      'file content as ArrayBuffer'
    );

    assert.deepEqual(
      fs.readFileSync('/file'),
      arrayBuffer
    );

    assert.isString(fs.readFileSync('/file', {encoding: 'utf8'}));
    
    assert.strictEqual(
      fs.readFileSync('/file', {encoding: 'utf8'}),
      contentStr
    );

  });


  it('should read string from file', function () {

    var fs = new BrowserFs();

    fs.writeFileSync('/file', 'file string content');
    assert.equal(
      fs.readFileSync('/file', {encoding: 'utf8'}), 
      'file string content'
    );

    fs.writeFileSync('/file', 'file string content');
    assert.equal(
      fs.readFileSync('/file', 'utf8'), 
      'file string content'
    );

  });


  it('should write buffer to file', function () {

    var fs = new BrowserFs(),
      testStr = 'file string content',
      buffer = Buffer.from(testStr, 'utf8');

    fs.writeFileSync('/file', buffer);
    assert.equal(fs.readFileSync('/file', {encoding: 'utf8'}), testStr);

  });


  it('should rename a file', function (done) {

    var fs = new BrowserFs(),
      testStr = 'file string content',
      oldStats, oldParentStats;

    fs.writeFileSync('/original_filename', testStr);
    oldStats = fs.statSync('/original_filename');
    oldParentStats = fs.statSync('/');

    setTimeout(function () {
      fs.rename('/original_filename', '/renamed_filename', function (err) {

        var newStats, newParentStats;

        assert(!fs.existsSync('/original_filename'), 'original file should not exist');
        assert(fs.existsSync('/renamed_filename'), 'renamed file should exist');
        assert.equal(
          fs.readFileSync('/renamed_filename', {encoding: 'utf8'}), 
          testStr, 
          'file content should be same as original file'
        );

        newStats = fs.statSync('/renamed_filename');
        assert(newStats.isFile(), 'renamed file should be type of file');
        assert(
          newStats.ctime > oldStats.ctime, 
          'new file stats ctime should be greater than old file stats ctime'
        );

        newParentStats = fs.statSync('/');
        assert(newParentStats.mtime > oldParentStats.mtime);

        done();
      });
    }, 1);

  }); // rename a file

  it('should delete a file', function () {
    
    var fs = new BrowserFs();

    fs.writeFileSync('file2unlink', 'file2unlink content');
    
    assert.isTrue(fs.existsSync('file2unlink'));
  
    fs.unlinkSync('file2unlink');

    assert.isFalse(fs.existsSync('file2unlink'));
  }); // delete a file


  it('should access file', function (done) {

    var fs = new BrowserFs();
    
    fs.writeFileSync('access-file', 'content');

    assert.throw(
      function () {
        fs.accessSync('no-access-file', BrowserFs.F_OK);
      },
      Error,
      'ENOENT'
    );

    assert.throw(
      function () {
        fs.accessSync('no-access-dir/file');
      },
      Error,
      'ENOENT'
    );

    assert.isTrue(fs.accessSync('access-file'));

    // async version
    fs.access('access-file', function (err) {

      assert(!err);

      done();
    });

  });

}); // describe files