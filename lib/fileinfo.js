/*jslint node: true */
'use strict';

var fs = require('fs');
var path = require('path');

// Used for checking TRUE Mime Type
var mmm = require('mmmagic');
var Magic = mmm.Magic;
var magic = new Magic(mmm.MAGIC_MIME_TYPE);

// Since Node 0.8, .existsSync() moved from path to fs:
var _existsSync = fs.existsSync || path.existsSync;

var getFileKey = function(filePath) {

    return path.basename(filePath);

};
var udf;

function FileInfo(file, opts, fields) {

    this.name = file.name;
    this.size = file.size;
    this.type = file.type;
    this.modified = file.lastMod;
    this.deleteType = 'DELETE';
    this.options = opts;
    this.key = getFileKey(file.path);
    this.versions = {};
    this.proccessed = false;
    this.width = udf;
    this.height = udf;
    this.fields = fields;
    this.path = file.path;
    if (opts.saveFile) {
        this.safeName();
    }
}
FileInfo.prototype.update = function(file) {
    this.size = file.size;
};
FileInfo.prototype.safeName = function() {
    var nameCountRegexp = /(?:(?: \(([\d]+)\))?(\.[^.]+))?$/;

    function nameCountFunc(s, index, ext) {
        return ' (' + ((parseInt(index, 10) || 0) + 1) + ')' + (ext || '');
    }

    // Prevent directory traversal and creating hidden system files:
    this.name = path.basename(this.name).replace(/^\.+/, '');
    // Prevent overwriting existing files:
    while (_existsSync(this.options.uploadDir + '/' + this.name)) {
        this.name = this.name.replace(nameCountRegexp, nameCountFunc);
    }
};

FileInfo.prototype.initUrls = function() {

    var that = this;
    var baseUrl = (that.options.useSSL ? 'https:' : 'http:') + '//' + that.options.host + that.options.uploadUrl;
    if (this.error) return;
    if (!this.awsFile) {
        that.url = baseUrl + encodeURIComponent(that.name);
        that.deleteUrl = baseUrl + encodeURIComponent(that.name);
        if (!that.hasVersionImages()) return;
        Object.keys(that.options.imageVersions).forEach(function(version) {
            if (_existsSync(that.options.uploadDir + '/' + version + '/' + that.name)) {
                that[version + 'Url'] = baseUrl + version + '/' + encodeURIComponent(that.name);
            } else {
                // create version failed, use the default url as version url
                that[version + 'Url'] = that.url;
            }
        });
        return;
    }

    that.url = that.awsFile.url;
    that.deleteUrl = that.options.uploadUrl + that.url.split('/')[that.url.split('/').length - 1].split('?')[0];
    if (!that.hasVersionImages()) return;
    Object.keys(that.options.imageVersions).forEach(function(version) {
        that[version + 'Url'] = that.url;
    });

};

FileInfo.prototype.validate = function(cb) {

    this.isValidMimeType(this.path, function(err, isValid) {

        if (!isValid) this.error = 'Filetype not allowed';

        // Do other checks...
        if (this.options.minFileSize && this.options.minFileSize > this.size) {
            this.error = 'File is too small';
        } else if (this.options.maxFileSize && this.options.maxFileSize < this.size) {
            this.error = 'File is too big';
        }

        return cb(err, !this.error);

    }.bind(this));

};
FileInfo.prototype.hasVersionImages = function() {
    return (this.options.copyImgAsThumb && this.options.imageTypes.test(this.url));
};

FileInfo.prototype.isValidMimeType = function(path, cb) {
    magic.detectFile(path, function(err, result) {
        if (err) return cb(err, null);
        if(this.options.acceptMimeTypes.indexOf(result) === -1) {
            return cb(null, false);
        }
        else {
            return cb(null, true);
        }
    }.bind(this));
}

module.exports = FileInfo;

module.exports.getFileKey = getFileKey;
