import excuteQueue from "../log/excuteQueue"
export function injectXHR() {
  let XMLHttpRequest = window.XMLHttpRequest

  let oldOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
    if (!url.match(/logstores/) && !url.match(/sockjs/)) {
      this.logData = {
        method,
        url,
        async,
        user,
        password,
      }
    }
    return oldOpen.apply(this, arguments)
  }

  let oldSend = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.send = function (body) {
    if (this.logData) {
      let start = Date.now()
      let handler = (type) => (event) => {
        let duration = Date.now() - start
        let status = this.status
        //匹配2xx或者3xx 则不提交日志
        if (/^[2|3].{2}$/.test(status)) {
          return
        }
        let statusText = this.statusText
        excuteQueue.add({
          logType: "monitor",
          logCode: "XHR_ERROR",
          logName: "接口错误",
          elementType: "page",
          eventType: type, //LOAD ERROR ABORT
          pathname: this.logData.url,
          status: status + "-" + statusText,
          duration: "" + duration,
          response: this.response ? JSON.stringify(this.response) : "",
          params: body || "",
        })
      }
      this.addEventListener("load", handler("LOAD"), false)
      this.addEventListener("error", handler("ERROR"), false)
      this.addEventListener("abort", handler("ABORT"), false)
    }
    oldSend.apply(this, arguments)
  }
}
