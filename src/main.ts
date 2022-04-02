export namespace RequestInstance {
	export enum Methods {
		post = "post",
		get = "get",
		put = "put",
		delete = "delete",
	}
	export type MethodsVal = keyof Record<Methods, string>

	export enum ErrorMesg {
		"codeError" = "Code Error",
		"onTimeout" = "On Timeout",
		"onAbort" = "On Abort",
		"onCancel" = "On Cancel",
		"networkError" = "Network Error",
	}
	export type ErrorMesgVal = keyof Record<ErrorMesg, string>

	export interface UniversalConfig {
		host?: string
		headers?: { [key: string]: string }
		timeout?: number
	}
	export interface InitialConfig extends UniversalConfig {
		host?: string
		interceptBefore?: (props: Data) => void
		interceptAfter?: (response: any) => void
	}
	export interface ConfigPropsExtension extends ConfigProps {
		method: MethodsVal
		dataForSend?: Document | XMLHttpRequestBodyInit | null | undefined
		paramsForSend?: string
	}
	export interface ConfigProps extends UniversalConfig {
		api: string
		params?: Data
		data?: Data
		formdata?: boolean
		cancelable?: boolean
		tryTimes?: number
		delayTime?: number
	}
	export type Props = [api: string | ConfigProps, data?: Data]
	export type Data = any
	export interface Error {
		message: ErrorMesgVal
		status: number
		statusText: string
		timeout: number
	}
	export type Multiple = (props?: any) => any
	export interface ExistedInstance {
		api: string
		method: RequestInstance.MethodsVal
		instance: XMLHttpRequest
	}
}

class Request implements RequestInstance.InitialConfig {
	host = ""
	timeout = 3000
	headers = {}
	interceptBefore
	interceptAfter
	existing: Record<string, XMLHttpRequest> = {}
	waiting: Record<string, RequestInstance.ConfigPropsExtension & { time: ReturnType<typeof setTimeout> }> = {}
	constructor(InitialConfig: RequestInstance.InitialConfig) {
		InitialConfig.host && (this.host = InitialConfig.host)
		InitialConfig.interceptBefore && (this.interceptBefore = InitialConfig.interceptBefore)
		InitialConfig.interceptAfter && (this.interceptAfter = InitialConfig.interceptAfter)
		InitialConfig.headers && (this.headers = JSON.stringify(InitialConfig.headers))
		InitialConfig.timeout && (this.timeout = InitialConfig.timeout)
	}
	judge(data: any): string {
		const a = Object.prototype.toString.call(data).match(/\[object ([A-Za-z]*)\]/)
		return a ? a[1].toLowerCase() : ""
	}
	toExist({ api, method, instance }: RequestInstance.ExistedInstance) {
		const key = api + method
		if (this.existing[key]) {
			this.existing[key] && this.existing[key].abort()
			delete this.existing[key]
		}
		this.existing[key] = instance
	}
	toFormData(data: any) {
		const _tMain = this.judge(data),
			_formdata = new FormData()
		if (_tMain === "object") {
			for (const key in data) {
				_formdata.append(key, data[key])
			}
		}
		return _formdata
	}
	debounce(config: RequestInstance.ConfigPropsExtension) {
		return new Promise<RequestInstance.Data>((resolve, reject) => {
			const key = config.method + config.api
			this.waiting[key] && window.clearTimeout(this.waiting[key].time)
			const _t = setTimeout(() => {
				delete this.waiting[key]
				this.send(config)
					.then((res) => resolve(res))
					.catch((err) => reject(err))
			}, config.delayTime)
			this.waiting[key] = { ...config, ...{ time: _t } }
		})
	}
	transferData(data: any, isFirst: boolean) {
		let _r = ""
		const _tMain = typeof data,
			_tMinor = this.judge(data)
		switch (_tMain) {
			case "object":
				if (_tMinor === "null") {
					_r = ""
					break
				}
				if (_tMinor === "formdata" && isFirst) {
					_r = data
					break
				}
				if (_tMinor === "object") {
					if (isFirst)
						for (const key in data) {
							const _v = this.transferData(data[key], false)
							_r += (_r ? "&" : "") + key + (_v ? "=" + _v : "")
						}
					else _r = JSON.stringify(data)

					break
				}
				if ("toString" in data.__proto__) {
					_r = data.toString()
					break
				}
				_r = data
				break
			case "symbol":
			case "function":
				_r = data.toString()
				break
			case "undefined":
				_r = ""
				break
			default:
				_r = data
				break
		}
		return _r + ""
	}
	combineConfig(...argu: RequestInstance.Props) {
		const config: RequestInstance.ConfigProps =
			typeof argu[0] === "string"
				? {
						api: argu[0],
						data: argu[1],
				  }
				: argu[0]
		this.headers &&
			(config.headers = {
				...{},
				...this.headers,
				...(config.headers || {}),
			})
		config.timeout = config.timeout || this.timeout
		config.host = config.host || this.host
		return config
	}
	resolve(resolve: (value: RequestInstance.Data) => void, request: XMLHttpRequest | null) {
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
				let res
				try {
					const isJson = responseHeaders["content-type"]?.indexOf("json")
					res = isJson ? JSON.parse(request.response) : request.response
				} catch (error) {
					res = request.response
				}
				this.interceptAfter && this.interceptAfter(res)
				return res
			})()
		)
		request = null
	}
	reject(reject: (value: RequestInstance.Error) => void, request: XMLHttpRequest | null, message: RequestInstance.ErrorMesgVal, config: RequestInstance.ConfigPropsExtension) {
		if (request === null) return
		if (message === RequestInstance.ErrorMesg.onCancel || message === RequestInstance.ErrorMesg.onAbort) return
		const error = { status: request.status, timeout: request.timeout, statusText: request.statusText, message }
		request = null
		if (config.tryTimes) {
			config.tryTimes -= 1
			this.send(config)
			return
		}
		reject(error)
	}
	get(...argu: RequestInstance.Props) {
		const config: RequestInstance.ConfigPropsExtension = {
			...this.combineConfig(
				typeof argu[0] === "string"
					? {
							api: argu[0],
							params: argu[1],
					  }
					: argu[0]
			),
			...{ method: RequestInstance.Methods.get },
		}
		return this.beforeSend(config)
	}
	delete(...argu: RequestInstance.Props) {
		const config: RequestInstance.ConfigPropsExtension = {
			...this.combineConfig(
				typeof argu[0] === "string"
					? {
							api: argu[0],
							params: argu[1],
					  }
					: argu[0]
			),
			...{ method: RequestInstance.Methods.delete },
		}
		return this.beforeSend(config)
	}
	post(...argu: RequestInstance.Props) {
		const config: RequestInstance.ConfigPropsExtension = {
			...this.combineConfig(
				typeof argu[0] === "string"
					? {
							api: argu[0],
							data: argu[1],
					  }
					: argu[0]
			),
			...{ method: RequestInstance.Methods.post },
		}
		return this.beforeSend(config)
	}
	put(...argu: RequestInstance.Props) {
		const config: RequestInstance.ConfigPropsExtension = {
			...this.combineConfig(
				typeof argu[0] === "string"
					? {
							api: argu[0],
							data: argu[1],
					  }
					: argu[0]
			),
			...{ method: RequestInstance.Methods.put },
		}
		return this.beforeSend(config)
	}
	beforeSend(config: RequestInstance.ConfigPropsExtension) {
		config.paramsForSend = this.transferData(config.params, true)
		if (config.data) config.dataForSend = config.formdata ? this.toFormData(config.data) : this.transferData(config.data, true)
		return config.delayTime ? this.debounce(config) : this.send(config)
	}
	send(config: RequestInstance.ConfigPropsExtension) {
		return new Promise<RequestInstance.Data | RequestInstance.Error>((resolve, reject) => {
			const request = new XMLHttpRequest(),
				_url = config.host + config.api + (config.paramsForSend ? "?" + config.paramsForSend : ""),
				_this = this
			request.open(config.method, _url, true)
			config.cancelable && this.toExist({ api: config.api, method: config.method, instance: request })

			request.onreadystatechange = function () {
				if (request.readyState === XMLHttpRequest.DONE) {
					if (request.status === 200) {
						_this.resolve(resolve, request)
					} else if (request.status === 0) {
						_this.reject(reject, request, RequestInstance.ErrorMesg.onCancel, config)
					} else _this.reject(reject, request, RequestInstance.ErrorMesg.codeError, config)
				}
			}
			// request.onloadend = () => {
			// console.log(2);
			// }
			request.ontimeout = function () {
				_this.reject(reject, request, RequestInstance.ErrorMesg.onTimeout, config)
			}
			request.onabort = function () {
				_this.reject(reject, request, RequestInstance.ErrorMesg.onAbort, config)
			}
			request.onerror = function () {
				_this.reject(reject, request, RequestInstance.ErrorMesg.networkError, config)
			}

			if (config.headers)
				for (const key in config.headers) {
					const _type = this.judge(config.dataForSend),
						_auto = ["formData", "undefined"]
					if (_auto.indexOf(_type)) break
					request.setRequestHeader(key, config.headers[key])
				}
			config.timeout && (request.timeout = config.timeout)

			request.send(JSON.stringify(config.dataForSend))
		})
	}
}
const request = new Request({})

export {Request, request}