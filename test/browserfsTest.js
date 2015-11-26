// $ npm test
// $ ./node_modules/.bin/mocha -w

var path = require('path');
var assert = require('chai').assert;
var util = require('util');
var requirejs = require('requirejs');

requirejs.config({
	paths: {
		'browserfs': path.join(__dirname, "../browserfs")
	}
});

var BrowserFS = requirejs('browserfs');

function trueFn() { return true }
function falseFn() { return false }

// http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
function str2ab(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function assertTimeCloseTo (testTime, expectedTime, delta, message) {
  expectedTime = expectedTime || Date.now();
  delta = delta || 500;
  assert.closeTo(testTime, expectedTime, delta, message);
}


describe("paths (nix only)", function () {

	it("should join paths", function () {

		var fs = new BrowserFS();

		[
			[["/", "a/b/c"], "/a/b/c"],
			[["/a", "b/ c"], "/a/b/c"],
			[["/a/b", "c"], "/a/b/c"],
			[["/a/", "b / c"], "/a/b/c"],
			[["/a//", "b/c"], "/a/b/c"],
			[["a", "b/c"], "a/b/c"],
			[["a/b", "c"], "a/b/c"],
			[["a/b", "./c"], "a/b/c"],
			[["a/b", "../c"], "a/c"],
			[["a/b", ". /c"], "a/b/c"],
			[["a/b", " .. /c"], "a/c"]
		].forEach(function (test) {
			var result = fs.joinPath.apply(fs, test[0]);
			assert.deepEqual(result, test[1], util.format('result: "%s", expected: "%s"', result, test[1]));
		});

	});


	it('should parse paths', function () {

		var fs = new BrowserFS();

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
			var result = fs.parsePath(test[0]);
			assert.deepEqual(result, test[1], util.format('result: "%s", expected: "%s"', result, test[1]));
		});

	});


	it('should return the directory name of a path', function () {

		var fs = new BrowserFS();

		assert.isFunction(fs.dirname);

		[
			{path: '', dirname: '/'},
			{path: '/', dirname: '/'},
			{path: '/a', dirname: '/'},
			{path: '/a/b', dirname: '/a'},
			{path: '/a/b/', dirname: '/a'},
			{path: '/a/b/c', dirname: '/a/b'},
			{path: '/a/b/../c', dirname: '/a'},
			{path: '/a/..', dirname: '/'},
			{path: '/a/../..', dirname: '/'},
			{path: 'a/b', dirname: '/a'},
		].forEach(function (test) {
			assert.strictEqual(
				fs.dirname(test.path),
				test.dirname,
				util.format('dirname for path: "%s"', test.path)
			);
		});

	});

});


describe('stats', function () {


	it('should have stats for root node', function () {

		var fs = new BrowserFS,
			result = fs.statSync('/');

		assert.strictEqual(result.isFile(), false);
		assert.strictEqual(result.isDirectory(), true);
		assert.strictEqual(result.isBlockDevice(), false);
		assert.strictEqual(result.isCharacterDevice(), false);
		assert.strictEqual(result.isSymbolicLink(), false);
		assert.strictEqual(result.isFIFO(), false);
		assert.strictEqual(result.isSocket(), false);		
		assertTimeCloseTo(result.atime.getTime());
		assertTimeCloseTo(result.mtime.getTime());
		assertTimeCloseTo(result.ctime.getTime());
		assert.strictEqual(result.size, 0);

	});


	it('should throw error for non existing files', function () {
	    assert.throw(
	      function () {
	      	var fs = new BrowserFS;
	      	fs.statSync('/unknown/path');
	      },
	      Error,
	      'ENOENT'
	    );
	});

});


describe('exists', function () {


	it('should test for existing directory', function () {

			var fs = new BrowserFS();

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


describe("directory", function () {


	it("should have a empty root directory as startup", function (done) {

		var fs = new BrowserFS();

		assert(fs.readdirSync('/'), []);

		fs.readdir("/", function (err, files) {
			if(err) throw err;
			assert(files, []);
			done();
		});

	});


	it('should create a directory', function () {

		var fs = new BrowserFS();

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


	it('should create a directories -p', function () {

		var fs = new BrowserFS();

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

		var fs = new BrowserFS();
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

		var fs = new BrowserFS();
		fs.mkdirpSync('/subdir/subdir2');
		fs.rmdirSync('/subdir/subdir2');
		assert(!fs.existsSync('/subdir/subdir2'));

	});


	it('should remove a non-empty directory', function () {
		var fs = new BrowserFS();
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

    var fs = new BrowserFS(),
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


});


describe('files', function () {


	it('should create a file', function () {

		var fs = new BrowserFS();

		assert(!fs.existsSync('/file'));
		fs.writeFileSync('/file', '');
		assert(fs.existsSync('/file'));
	});


	it('should write string to file', function () {
		var fs = new BrowserFS();

		fs.writeFileSync('/file', 'file string content');
		assert(fs.existsSync('/file'));
	});


	it('should read string from file', function () {

		var fs = new BrowserFS();
		fs.writeFileSync('/file', 'file string content');
		assert.equal(fs.readFileSync('/file', {encoding: 'string'}), 'file string content');

	});


	it('should write buffer to file', function () {

		var fs = new BrowserFS(),
		  testStr = 'file string content',
			buffer = str2ab(testStr);

		fs.writeFileSync('/file', buffer);
		assert.equal(fs.readFileSync('/file', {encoding: 'string'}), testStr);

	});


  it('should rename a file', function (done) {

    var fs = new BrowserFS(),
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
        assert.equal(fs.readFileSync('/renamed_filename', {encoding: 'string'}), testStr, 'file content should be same as original file');

        newStats = fs.statSync('/renamed_filename');
        assert(newStats.isFile(), 'renamed file should be type of file');
        assert(newStats.ctime > oldStats.ctime, 'new file stats ctime should be greater than old file stats ctime');

        newParentStats = fs.statSync('/');
        assert(newParentStats.mtime > oldParentStats.mtime);

        done();
      });
    }, 1);

  });


});