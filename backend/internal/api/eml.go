package api

import (
	"encoding/base64"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net/mail"
	"os"
	"strings"
)

func extractBody(path string) string {
	f, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer f.Close()

	msg, err := mail.ReadMessage(f)
	if err != nil {
		return ""
	}

	mediaType, params, err := mime.ParseMediaType(msg.Header.Get("Content-Type"))
	if err != nil {
		body, _ := io.ReadAll(msg.Body)
		return string(body)
	}

	if strings.HasPrefix(mediaType, "multipart/") {
		return walkMultipart(msg.Body, params["boundary"])
	}
	if mediaType == "text/html" || mediaType == "text/plain" {
		body, _ := io.ReadAll(msg.Body)
		return decodeBody(msg.Header.Get("Content-Transfer-Encoding"), body)
	}
	body, _ := io.ReadAll(msg.Body)
	return string(body)
}

func walkMultipart(r io.Reader, boundary string) string {
	mr := multipart.NewReader(r, boundary)
	for {
		p, err := mr.NextPart()
		if err != nil {
			break
		}
		ct := p.Header.Get("Content-Type")
		mediaType, params, _ := mime.ParseMediaType(ct)
		partBody, _ := io.ReadAll(p)

		if strings.HasPrefix(mediaType, "multipart/") {
			if html := walkMultipart(strings.NewReader(string(partBody)), params["boundary"]); html != "" {
				return html
			}
		} else if mediaType == "text/html" {
			return decodeBody(p.Header.Get("Content-Transfer-Encoding"), partBody)
		}
	}
	return ""
}

func decodeBody(encoding string, data []byte) string {
	switch strings.ToLower(encoding) {
	case "base64":
		dst := make([]byte, base64.StdEncoding.DecodedLen(len(data)))
		n, err := base64.StdEncoding.Decode(dst, data)
		if err != nil {
			return strings.TrimSpace(string(data))
		}
		return strings.TrimSpace(string(dst[:n]))
	case "quoted-printable":
		r := quotedprintable.NewReader(strings.NewReader(string(data)))
		decoded, err := io.ReadAll(r)
		if err != nil {
			return strings.TrimSpace(string(data))
		}
		return strings.TrimSpace(string(decoded))
	default:
		return strings.TrimSpace(string(data))
	}
}
