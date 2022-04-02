'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

exports.RequestInstance = void 0;
(function (RequestInstance) {
    (function (Methods) {
        Methods["post"] = "post";
        Methods["get"] = "get";
        Methods["put"] = "put";
        Methods["delete"] = "delete";
    })(RequestInstance.Methods || (RequestInstance.Methods = {}));
    (function (ErrorMesg) {
        ErrorMesg["codeError"] = "Code Error";
        ErrorMesg["onTimeout"] = "On Timeout";
        ErrorMesg["onAbort"] = "On Abort";
        ErrorMesg["onCancel"] = "On Cancel";
        ErrorMesg["networkError"] = "Network Error";
    })(RequestInstance.ErrorMesg || (RequestInstance.ErrorMesg = {}));
})(exports.RequestInstance || (exports.RequestInstance = {}));
var Request = /** @class */ (function () {
    function Request(InitialConfig) {
        this.host = "";
        this.timeout = 3000;
        this.headers = {};
        this.existing = {};
        this.waiting = {};
        InitialConfig.host && (this.host = InitialConfig.host);
        InitialConfig.interceptBefore && (this.interceptBefore = InitialConfig.interceptBefore);
        InitialConfig.interceptAfter && (this.interceptAfter = InitialConfig.interceptAfter);
        InitialConfig.headers && (this.headers = JSON.stringify(InitialConfig.headers));
        InitialConfig.timeout && (this.timeout = InitialConfig.timeout);
    }
    Request.prototype.judge = function (data) {
        var a = Object.prototype.toString.call(data).match(/\[object ([A-Za-z]*)\]/);
        return a ? a[1].toLowerCase() : "";
    };
    Request.prototype.toExist = function (_a) {
        var api = _a.api, method = _a.method, instance = _a.instance;
        var key = api + method;
        if (this.existing[key]) {
            this.existing[key] && this.existing[key].abort();
            delete this.existing[key];
        }
        this.existing[key] = instance;
    };
    Request.prototype.toFormData = function (data) {
        var _tMain = this.judge(data), _formdata = new FormData();
        if (_tMain === "object") {
            for (var key in data) {
                _formdata.append(key, data[key]);
            }
        }
        return _formdata;
    };
    Request.prototype.debounce = function (config) {
        var _this_1 = this;
        return new Promise(function (resolve, reject) {
            var key = config.method + config.api;
            _this_1.waiting[key] && window.clearTimeout(_this_1.waiting[key].time);
            var _t = setTimeout(function () {
                delete _this_1.waiting[key];
                _this_1.send(config)
                    .then(function (res) { return resolve(res); })
                    .catch(function (err) { return reject(err); });
            }, config.delayTime);
            _this_1.waiting[key] = __assign(__assign({}, config), { time: _t });
        });
    };
    Request.prototype.transferData = function (data, isFirst) {
        var _r = "";
        var _tMain = typeof data, _tMinor = this.judge(data);
        switch (_tMain) {
            case "object":
                if (_tMinor === "null") {
                    _r = "";
                    break;
                }
                if (_tMinor === "formdata" && isFirst) {
                    _r = data;
                    break;
                }
                if (_tMinor === "object") {
                    if (isFirst)
                        for (var key in data) {
                            var _v = this.transferData(data[key], false);
                            _r += (_r ? "&" : "") + key + (_v ? "=" + _v : "");
                        }
                    else
                        _r = JSON.stringify(data);
                    break;
                }
                if ("toString" in data.__proto__) {
                    _r = data.toString();
                    break;
                }
                _r = data;
                break;
            case "symbol":
            case "function":
                _r = data.toString();
                break;
            case "undefined":
                _r = "";
                break;
            default:
                _r = data;
                break;
        }
        return _r + "";
    };
    Request.prototype.combineConfig = function () {
        var argu = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argu[_i] = arguments[_i];
        }
        var config = typeof argu[0] === "string"
            ? {
                api: argu[0],
                data: argu[1],
            }
            : argu[0];
        this.headers &&
            (config.headers = __assign(__assign({}, this.headers), (config.headers || {})));
        config.timeout = config.timeout || this.timeout;
        config.host = config.host || this.host;
        return config;
    };
    Request.prototype.resolve = function (resolve, request) {
        var _this_1 = this;
        if (request === null)
            return;
        var responseHeaders = (function () {
            var _res = {};
            var _r = request.getAllResponseHeaders() || "";
            _r.replace(/(.*): (.*)/gim, function (r1, r2, r3) {
                _res[r2] = r3;
                return "";
            });
            return _res;
        })();
        resolve((function () {
            var _a;
            var res;
            try {
                var isJson = (_a = responseHeaders["content-type"]) === null || _a === void 0 ? void 0 : _a.indexOf("json");
                res = isJson ? JSON.parse(request.response) : request.response;
            }
            catch (error) {
                res = request.response;
            }
            _this_1.interceptAfter && _this_1.interceptAfter(res);
            return res;
        })());
        request = null;
    };
    Request.prototype.reject = function (reject, request, message, config) {
        if (request === null)
            return;
        if (message === exports.RequestInstance.ErrorMesg.onCancel || message === exports.RequestInstance.ErrorMesg.onAbort)
            return;
        var error = { status: request.status, timeout: request.timeout, statusText: request.statusText, message: message };
        request = null;
        if (config.tryTimes) {
            config.tryTimes -= 1;
            this.send(config);
            return;
        }
        reject(error);
    };
    Request.prototype.get = function () {
        var argu = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argu[_i] = arguments[_i];
        }
        var config = __assign(__assign({}, this.combineConfig(typeof argu[0] === "string"
            ? {
                api: argu[0],
                params: argu[1],
            }
            : argu[0])), { method: exports.RequestInstance.Methods.get });
        return this.beforeSend(config);
    };
    Request.prototype.delete = function () {
        var argu = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argu[_i] = arguments[_i];
        }
        var config = __assign(__assign({}, this.combineConfig(typeof argu[0] === "string"
            ? {
                api: argu[0],
                params: argu[1],
            }
            : argu[0])), { method: exports.RequestInstance.Methods.delete });
        return this.beforeSend(config);
    };
    Request.prototype.post = function () {
        var argu = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argu[_i] = arguments[_i];
        }
        var config = __assign(__assign({}, this.combineConfig(typeof argu[0] === "string"
            ? {
                api: argu[0],
                data: argu[1],
            }
            : argu[0])), { method: exports.RequestInstance.Methods.post });
        return this.beforeSend(config);
    };
    Request.prototype.put = function () {
        var argu = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argu[_i] = arguments[_i];
        }
        var config = __assign(__assign({}, this.combineConfig(typeof argu[0] === "string"
            ? {
                api: argu[0],
                data: argu[1],
            }
            : argu[0])), { method: exports.RequestInstance.Methods.put });
        return this.beforeSend(config);
    };
    Request.prototype.beforeSend = function (config) {
        config.paramsForSend = this.transferData(config.params, true);
        if (config.data)
            config.dataForSend = config.formdata ? this.toFormData(config.data) : this.transferData(config.data, true);
        return config.delayTime ? this.debounce(config) : this.send(config);
    };
    Request.prototype.send = function (config) {
        var _this_1 = this;
        return new Promise(function (resolve, reject) {
            var request = new XMLHttpRequest(), _url = config.host + config.api + (config.paramsForSend ? "?" + config.paramsForSend : ""), _this = _this_1;
            request.open(config.method, _url, true);
            config.cancelable && _this_1.toExist({ api: config.api, method: config.method, instance: request });
            request.onreadystatechange = function () {
                if (request.readyState === XMLHttpRequest.DONE) {
                    if (request.status === 200) {
                        _this.resolve(resolve, request);
                    }
                    else if (request.status === 0) {
                        _this.reject(reject, request, exports.RequestInstance.ErrorMesg.onCancel, config);
                    }
                    else
                        _this.reject(reject, request, exports.RequestInstance.ErrorMesg.codeError, config);
                }
            };
            // request.onloadend = () => {
            // console.log(2);
            // }
            request.ontimeout = function () {
                _this.reject(reject, request, exports.RequestInstance.ErrorMesg.onTimeout, config);
            };
            request.onabort = function () {
                _this.reject(reject, request, exports.RequestInstance.ErrorMesg.onAbort, config);
            };
            request.onerror = function () {
                _this.reject(reject, request, exports.RequestInstance.ErrorMesg.networkError, config);
            };
            if (config.headers)
                for (var key in config.headers) {
                    var _type = _this_1.judge(config.dataForSend), _auto = ["formData", "undefined"];
                    if (_auto.indexOf(_type))
                        break;
                    request.setRequestHeader(key, config.headers[key]);
                }
            config.timeout && (request.timeout = config.timeout);
            request.send(JSON.stringify(config.dataForSend));
        });
    };
    return Request;
}());
var request = new Request({});

exports.Request = Request;
exports.request = request;
