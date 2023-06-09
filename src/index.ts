namespace RequestInstance {
	export enum Methods {
		post = "post",
		get = "get",
		put = "put",
		delete = "delete",
	}
	export type MethodsVal = `${Methods}`
	export type s = {
		[Property in MethodsVal]: any
	}
	export enum ErrorMesg {
		"codeError" = "Code Error",
		"onTimeout" = "On Timeout",
		"onAbort" = "On Abort",
		"onCancel" = "On Cancel",
		"networkError" = "Network Error",
	}
	export type ErrorMesgVal = `${ErrorMesg}`

	export interface CreateProps {
		host?: string
		headers?: Record<string, any>
		timeout?: number
		interceptAfter?: (props: { result: any; type: "success" | "error" }) => any
	}
	export interface InvocationProps extends CreateProps {
		api: string
		params?: any
		data?: any
		formData?: boolean
		responseType?: XMLHttpRequest["responseType"]
		cancelable?: boolean
		tryTimes?: number
		delayTime?: number
	}
	export interface InvocationPropsExtension extends InvocationProps {
		headers: { [key: string]: string }
		method: MethodsVal
		dataForSend?: Document | XMLHttpRequestBodyInit | null | undefined
		paramsForSend?: string
	}
	export type Props = [api: string, params?: any, data?: any] | [InvocationProps]

	export interface Error {
		message: ErrorMesgVal
		status: number
		statusText: string
		timeout: number
	}
	export type Multiple = (props?: any) => any
	export interface ExistedInstance {
		key: string
		instance: XMLHttpRequest
	}
}

class Request implements RequestInstance.CreateProps {
	host = ""
	timeout
	headers
	interceptAfter
	existing: Record<string, XMLHttpRequest> = {}
	waiting: Record<string, RequestInstance.InvocationPropsExtension & { time: ReturnType<typeof setTimeout> }> = {}
	constructor(CreateProps: RequestInstance.CreateProps) {
		CreateProps.host && (this.host = CreateProps.host)
		CreateProps.interceptAfter && (this.interceptAfter = CreateProps.interceptAfter)
		CreateProps.headers && (this.headers = CreateProps.headers)
		CreateProps.timeout && (this.timeout = CreateProps.timeout)
	}
	combine<D>(method: RequestInstance.MethodsVal, ...argu: RequestInstance.Props) {
		const _p = {
			...(typeof argu[0] === "string"
				? {
						api: argu[0],
						params: argu[1],
						data: argu[2],
				  }
				: argu[0]),
			method,
		}
		const _h: Record<string, string> = {
			...{},
			...(this.headers || {}),
			...(_p.headers || {}),
		}
		const config: RequestInstance.InvocationPropsExtension = {
			..._p,
			headers: _h,
			timeout: _p.timeout || this.timeout,
			host: _p.host || this.host,
			paramsForSend: this.toParams(_p.params),
			dataForSend: (() => {
				if (_p.data === undefined) return undefined
				if (_p.formData || Object.entries(_p.data).find((item) => this.judge(item[1]) === "file")) return this.toFormData(_p.data)
				return _p.data
			})(),
		}

		if ("delayTime" in config) {
			return new Promise<D>((resolve, reject) => {
				const key = this.reqKey(config)
				this.waiting[key] && window.clearTimeout(this.waiting[key].time)
				const _t = setTimeout(() => {
					delete this.waiting[key]
					this.send<D>(config)
						.then((res) => resolve(res))
						.catch((err) => reject(err))
				}, config.delayTime)
				this.waiting[key] = { ...config, ...{ time: _t } }
			})
		}
		return this.send<D>(config)
	}
	get<D>(...props: RequestInstance.Props) {
		return this.combine<D>(RequestInstance.Methods.get, ...props)
	}
	post<D>(...props: RequestInstance.Props) {
		return this.combine<D>(RequestInstance.Methods.post, ...props)
	}
	put<D>(...props: RequestInstance.Props) {
		return this.combine<D>(RequestInstance.Methods.put, ...props)
	}
	delete<D>(...props: RequestInstance.Props) {
		return this.combine<D>(RequestInstance.Methods.delete, ...props)
	}
	judge(data: any): string {
		const a = Object.prototype.toString.call(data).match(/\[object ([A-Za-z]*)\]/)
		return a ? a[1].toLowerCase() : ""
	}
	reqKey(config: RequestInstance.InvocationPropsExtension) {
		return config.method + config.api + config.paramsForSend
	}
	toExist({ key, instance }: RequestInstance.ExistedInstance) {
		if (this.existing[key]) {
			this.existing[key] && this.existing[key].abort()
			delete this.existing[key]
		}
		this.existing[key] = instance
	}
	toFormData(data: Record<string, string | Blob>) {
		const _tMain = this.judge(data),
			_formdata = new FormData()
		if (_tMain === "object") {
			Object.entries(data).forEach((item) => _formdata.append(item[0], item[1]))
		}
		return _formdata
	}
	toString(data: any) {
		let _r = ""
		const _tMain = typeof data,
			_tMinor = this.judge(data)
		switch (_tMain) {
			case "object":
				try {
					_r = JSON.stringify(data)
				} catch (error) {
					_r = "[object object]"
				}
				break
			case "symbol":
			case "function":
				_r = data.toString()
				break
			default:
				_r = data
				break
		}
		return _r
	}
	toParams(data: any) {
		let _r = ""
		for (const key in data) {
			const _v = this.toString(data[key])
			_r += (_r ? "&" : "") + key + (_v ? "=" + _v : "")
		}
		return _r
	}

	resolve<D>(resolve: (value: D) => void, request: XMLHttpRequest | null) {
		if (request === null) return
		const responseHeaders = (() => {
			const _res: Record<string, string> = {}
			const _r = request.getAllResponseHeaders() || ""
			_r.replace(/(.*): (.*)/gim, (r1, r2, r3) => {
				_res[r2] = r3
				return ""
			})
			return _res
		})()
		resolve(
			(() => {
				const result = (() => {
					try {
						const isJson = responseHeaders["content-type"]?.indexOf("json")
						return isJson ? JSON.parse(request.response) : request
					} catch (error) {
						return request
					}
				})()

				const _return = this.interceptAfter && this.interceptAfter({ result: result, type: "success" })
				return _return !== undefined ? _return : result
			})()
		)
		request = null
	}
	reject(reject: (value: RequestInstance.Error) => void, request: XMLHttpRequest | null, message: RequestInstance.ErrorMesgVal, config: RequestInstance.InvocationPropsExtension) {
		if (request === null) return
		if (message === RequestInstance.ErrorMesg.onCancel || message === RequestInstance.ErrorMesg.onAbort) return

		const error = {
			status: request.status,
			timeout: request.timeout,
			statusText: request.statusText,
			message,
			response: (() => {
				try {
					return JSON.parse(request.response)
				} catch (error) {
					return { body: request.response }
				}
			})(),
		}
		request = null
		if (config.tryTimes) {
			config.tryTimes -= 1
			this.send(config)
			return
		}
		const _return = this.interceptAfter && this.interceptAfter({ result: error, type: "error" })
		reject(_return !== undefined ? _return : error)
	}
	send<D>(config: RequestInstance.InvocationPropsExtension) {
		return new Promise<D>((resolve, reject) => {
			const api = /http|https/.test(config.api) ? config.api : config.host + config.api
			const request = new XMLHttpRequest(),
				_url = api + (config.paramsForSend ? "?" + config.paramsForSend : ""),
				_this = this
			request.open(config.method, _url, true)
			config.cancelable && this.toExist({ key: this.reqKey(config), instance: request })
			config.responseType !== undefined && (request.responseType = config.responseType)
			request.onreadystatechange = function () {
				if (request.readyState === XMLHttpRequest.DONE) {
					if (request.status === 200) {
						_this.resolve(resolve, request)
					} else if (request.status === 0) {
						_this.reject(reject, request, RequestInstance.ErrorMesg.onCancel, config)
					} else _this.reject(reject, request, RequestInstance.ErrorMesg.codeError, config)
				}
			}
			request.ontimeout = function () {
				_this.reject(reject, request, RequestInstance.ErrorMesg.onTimeout, config)
			}
			request.onabort = function () {
				_this.reject(reject, request, RequestInstance.ErrorMesg.onAbort, config)
			}
			request.onerror = function () {
				_this.reject(reject, request, RequestInstance.ErrorMesg.networkError, config)
			}
			const _DataT = this.judge(config.dataForSend)

			if (_DataT === "object") request.setRequestHeader("Content-Type", "application/json")
			if (config.headers)
				for (const key in config.headers) {
					request.setRequestHeader(key, config.headers[key])
				}
			config.timeout && (request.timeout = config.timeout)

			request.send(_DataT === "formdata" ? config.dataForSend : JSON.stringify(config.dataForSend))
		})
	}
}

export default Request
