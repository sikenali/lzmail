package webui

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

// 前端静态产物由 CI 在编译前复制到 dist/。仓库内保留 dist/.keep 作为占位，
// 因此普通服务端构建（未复制前端）仍然只提供 API，行为与之前一致。
//
//go:embed all:dist
var embedded embed.FS

// Available 表示本次构建是否嵌入了前端页面。
func Available() bool {
	_, err := fs.Stat(embedded, "dist/index.html")
	return err == nil
}

// Handler 提供嵌入式前端静态文件，并把无扩展名路由映射到对应的 .html 文件，
// 例如 /mail -> mail.html、/contacts -> contacts.html。
func Handler() http.Handler {
	sub, err := fs.Sub(embedded, "dist")
	if err != nil {
		return http.NotFoundHandler()
	}
	fileServer := http.FileServer(http.FS(sub))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := strings.TrimPrefix(r.URL.Path, "/")
		p = strings.TrimSuffix(p, "/")
		if p == "" {
			p = "index.html"
		}
		if _, statErr := fs.Stat(sub, p); statErr != nil {
			if _, htmlErr := fs.Stat(sub, p+".html"); htmlErr == nil {
				r2 := r.Clone(r.Context())
				r2.URL.Path = "/" + p + ".html"
				fileServer.ServeHTTP(w, r2)
				return
			}
		}
		fileServer.ServeHTTP(w, r)
	})
}
