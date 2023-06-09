'use strict';

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

function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
}

var RequestInstance;
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
})(RequestInstance || (RequestInstance = {}));
var Request = /** @class */ (function () {
    function Request(CreateProps) {
        this.host = "";
        this.existing = {};
        this.waiting = {};
        CreateProps.host && (this.host = CreateProps.host);
        CreateProps.interceptAfter && (this.interceptAfter = CreateProps.interceptAfter);
        CreateProps.headers && (this.headers = CreateProps.headers);
        CreateProps.timeout && (this.timeout = CreateProps.timeout);
    }
    Request.prototype.combine = function (method) {
        var _this_1 = this;
        var argu = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            argu[_i - 1] = arguments[_i];
        }
        var _p = __assign(__assign({}, (typeof argu[0] === "string"
            ? {
                api: argu[0],
                params: argu[1],
                data: argu[2],
            }
            : argu[0])), { method: method });
        var _h = __assign(__assign({}, (this.headers || {})), (_p.headers || {}));
        var config = __assign(__assign({}, _p), { headers: _h, timeout: _p.timeout || this.timeout, host: _p.host || this.host, paramsForSend: this.toParams(_p.params), dataForSend: (function () {
                if (_p.data === undefined)
                    return undefined;
                if (_p.formData || Object.entries(_p.data).find(function (item) { return _this_1.judge(item[1]) === "file"; }))
                    return _this_1.toFormData(_p.data);
                return _p.data;
            })() });
        if ("delayTime" in config) {
            return new Promise(function (resolve, reject) {
                var key = _this_1.reqKey(config);
                _this_1.waiting[key] && window.clearTimeout(_this_1.waiting[key].time);
                var _t = setTimeout(function () {
                    delete _this_1.waiting[key];
                    _this_1.send(config)
                        .then(function (res) { return resolve(res); })
                        .catch(function (err) { return reject(err); });
                }, config.delayTime);
                _this_1.waiting[key] = __assign(__assign({}, config), { time: _t });
            });
        }
        return this.send(config);
    };
    Request.prototype.get = function () {
        var props = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            props[_i] = arguments[_i];
        }
        return this.combine.apply(this, __spreadArray([RequestInstance.Methods.get], props, false));
    };
    Request.prototype.post = function () {
        var props = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            props[_i] = arguments[_i];
        }
        return this.combine.apply(this, __spreadArray([RequestInstance.Methods.post], props, false));
    };
    Request.prototype.put = function () {
        var props = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            props[_i] = arguments[_i];
        }
        return this.combine.apply(this, __spreadArray([RequestInstance.Methods.put], props, false));
    };
    Request.prototype.delete = function () {
        var props = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            props[_i] = arguments[_i];
        }
        return this.combine.apply(this, __spreadArray([RequestInstance.Methods.delete], props, false));
    };
    Request.prototype.judge = function (data) {
        var a = Object.prototype.toString.call(data).match(/\[object ([A-Za-z]*)\]/);
        return a ? a[1].toLowerCase() : "";
    };
    Request.prototype.reqKey = function (config) {
        return config.method + config.api + config.paramsForSend;
    };
    Request.prototype.toExist = function (_a) {
        var key = _a.key, instance = _a.instance;
        if (this.existing[key]) {
            this.existing[key] && this.existing[key].abort();
            delete this.existing[key];
        }
        this.existing[key] = instance;
    };
    Request.prototype.toFormData = function (data) {
        var _tMain = this.judge(data), _formdata = new FormData();
        if (_tMain === "object") {
            Object.entries(data).forEach(function (item) { return _formdata.append(item[0], item[1]); });
        }
        return _formdata;
    };
    Request.prototype.toString = function (data) {
        var _r = "";
        var _tMain = typeof data; this.judge(data);
        switch (_tMain) {
            case "object":
                try {
                    _r = JSON.stringify(data);
                }
                catch (error) {
                    _r = "[object object]";
                }
                break;
            case "symbol":
            case "function":
                _r = data.toString();
                break;
            default:
                _r = data;
                break;
        }
        return _r;
    };
    Request.prototype.toParams = function (data) {
        var _r = "";
        for (var key in data) {
            var _v = this.toString(data[key]);
            _r += (_r ? "&" : "") + key + (_v ? "=" + _v : "");
        }
        return _r;
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
            var result = (function () {
                var _a;
                try {
                    var isJson = (_a = responseHeaders["content-type"]) === null || _a === void 0 ? void 0 : _a.indexOf("json");
                    return isJson ? JSON.parse(request.response) : request;
                }
                catch (error) {
                    return request;
                }
            })();
            var _return = _this_1.interceptAfter && _this_1.interceptAfter({ result: result, type: "success" });
            return _return !== undefined ? _return : result;
        })());
        request = null;
    };
    Request.prototype.reject = function (reject, request, message, config) {
        if (request === null)
            return;
        if (message === RequestInstance.ErrorMesg.onCancel || message === RequestInstance.ErrorMesg.onAbort)
            return;
        var error = {
            status: request.status,
            timeout: request.timeout,
            statusText: request.statusText,
            message: message,
            response: (function () {
                try {
                    return JSON.parse(request.response);
                }
                catch (error) {
                    return { body: request.response };
                }
            })(),
        };
        request = null;
        if (config.tryTimes) {
            config.tryTimes -= 1;
            this.send(config);
            return;
        }
        var _return = this.interceptAfter && this.interceptAfter({ result: error, type: "error" });
        reject(_return !== undefined ? _return : error);
    };
    Request.prototype.send = function (config) {
        var _this_1 = this;
        return new Promise(function (resolve, reject) {
            var api = /http|https/.test(config.api) ? config.api : config.host + config.api;
            var request = new XMLHttpRequest(), _url = api + (config.paramsForSend ? "?" + config.paramsForSend : ""), _this = _this_1;
            request.open(config.method, _url, true);
            config.cancelable && _this_1.toExist({ key: _this_1.reqKey(config), instance: request });
            config.responseType !== undefined && (request.responseType = config.responseType);
            request.onreadystatechange = function () {
                if (request.readyState === XMLHttpRequest.DONE) {
                    if (request.status === 200) {
                        _this.resolve(resolve, request);
                    }
                    else if (request.status === 0) {
                        _this.reject(reject, request, RequestInstance.ErrorMesg.onCancel, config);
                    }
                    else
                        _this.reject(reject, request, RequestInstance.ErrorMesg.codeError, config);
                }
            };
            request.ontimeout = function () {
                _this.reject(reject, request, RequestInstance.ErrorMesg.onTimeout, config);
            };
            request.onabort = function () {
                _this.reject(reject, request, RequestInstance.ErrorMesg.onAbort, config);
            };
            request.onerror = function () {
                _this.reject(reject, request, RequestInstance.ErrorMesg.networkError, config);
            };
            var _DataT = _this_1.judge(config.dataForSend);
            if (_DataT === "object")
                request.setRequestHeader("Content-Type", "application/json");
            if (config.headers)
                for (var key in config.headers) {
                    request.setRequestHeader(key, config.headers[key]);
                }
            config.timeout && (request.timeout = config.timeout);
            request.send(_DataT === "formdata" ? config.dataForSend : JSON.stringify(config.dataForSend));
        });
    };
    return Request;
}());

module.exports = Request;
//# sourceMappingURL=bundle.js.map
