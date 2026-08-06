package archive

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"html"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net/mail"
	"net/textproto"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"
)

// Attachment 是邮件中提取出的附件
type Attachment struct {
	Filename string
	MimeType string
	Size     int64
	Content  []byte
}

// Parsed 是从 RFC822 原始邮件解析出的正文与附件信息
type Parsed struct {
	Preview        string
	Date           time.Time
	HasAttachments bool
	Attachments    []Attachment
}

var htmlTagRe = regexp.MustCompile(`(?i)<(script|style)[^>]*>.*?</(script|style)>|<[^>]+>`)

// Parse 解析 RFC822 原始邮件，提取正文预览与附件。
func Parse(raw []byte) (*Parsed, error) {
	msg, err := mail.ReadMessage(bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}

	p := &Parsed{Date: time.Now().UTC()}
	if d, err := msg.Header.Date(); err == nil {
		p.Date = d
	}

	var plainParts, htmlParts []string

	var walk func(r io.Reader, header map[string][]string, contentType, boundary string) error
	walk = func(r io.Reader, header map[string][]string, contentType, boundary string) error {
		if strings.HasPrefix(contentType, "multipart/") && boundary != "" {
			mr := multipart.NewReader(r, boundary)
			for {
				part, err := mr.NextPart()
				if err == io.EOF {
					break
				}
				if err != nil {
					return err
				}
				ct := part.Header.Get("Content-Type")
				mediaType, params, perr := mime.ParseMediaType(ct)
				if perr != nil {
					mediaType = ct
					params = map[string]string{}
				}
				partBytes, err := io.ReadAll(part)
				if err != nil {
					continue
				}

				if strings.HasPrefix(mediaType, "multipart/") {
					if err := walk(bytes.NewReader(partBytes), part.Header, mediaType, params["boundary"]); err != nil {
						return err
					}
					continue
				}

				disp := part.Header.Get("Content-Disposition")
				_, dispParams, _ := mime.ParseMediaType(disp)
				isAttachment := strings.EqualFold(strings.SplitN(disp, ";", 2)[0], "attachment")

				if isAttachment || isBinaryPart(mediaType) {
					filename := dispParams["filename"]
					if filename == "" {
						filename = params["name"]
					}
					if filename == "" {
						filename = "attachment"
					}
					content := decodePart(part.Header.Get("Content-Transfer-Encoding"), partBytes)
					p.Attachments = append(p.Attachments, Attachment{
						Filename: filename,
						MimeType: mediaType,
						Size:     int64(len(content)),
						Content:  content,
					})
					p.HasAttachments = true
					continue
				}

				text := decodePart(part.Header.Get("Content-Transfer-Encoding"), partBytes)
				switch {
				case mediaType == "text/plain":
					plainParts = append(plainParts, string(text))
				case mediaType == "text/html":
					htmlParts = append(htmlParts, string(text))
				}
			}
			return nil
		}

		// 非 multipart：整体作为正文
		data, _ := io.ReadAll(r)
		text := decodePart(textproto.MIMEHeader(header).Get("Content-Transfer-Encoding"), data)
		switch {
		case strings.HasPrefix(contentType, "text/plain"):
			plainParts = append(plainParts, string(text))
		case strings.HasPrefix(contentType, "text/html"):
			htmlParts = append(htmlParts, string(text))
		default:
			plainParts = append(plainParts, string(text))
		}
		return nil
	}

	contentType, params, err := mime.ParseMediaType(msg.Header.Get("Content-Type"))
	if err != nil {
		contentType = "text/plain"
		params = map[string]string{}
	}
	if err := walk(msg.Body, msg.Header, contentType, params["boundary"]); err != nil {
		return nil, err
	}

	p.Preview = buildPreview(plainParts, htmlParts)
	return p, nil
}

// isBinaryPart 判断非文本的独立部分（如 pdf、图片、压缩包等）是否应作为附件保存
func isBinaryPart(mediaType string) bool {
	if mediaType == "" {
		return false
	}
	if strings.HasPrefix(mediaType, "text/") || strings.HasPrefix(mediaType, "multipart/") || strings.HasPrefix(mediaType, "message/") {
		return false
	}
	return true
}

func decodePart(encoding string, data []byte) []byte {
	switch strings.ToLower(strings.TrimSpace(encoding)) {
	case "base64":
		dst := make([]byte, base64.StdEncoding.DecodedLen(len(data)))
		n, err := base64.StdEncoding.Decode(dst, data)
		if err != nil {
			return data
		}
		return dst[:n]
	case "quoted-printable":
		r := quotedprintable.NewReader(bytes.NewReader(data))
		decoded, err := io.ReadAll(r)
		if err != nil {
			return data
		}
		return decoded
	default:
		return data
	}
}

func buildPreview(plainParts, htmlParts []string) string {
	var raw string
	if len(plainParts) > 0 {
		for _, p := range plainParts {
			if strings.TrimSpace(p) != "" {
				raw = p
				break
			}
		}
	}
	if raw == "" && len(htmlParts) > 0 {
		for _, p := range htmlParts {
			if strings.TrimSpace(p) != "" {
				raw = htmlTagRe.ReplaceAllString(p, " ")
				raw = html.UnescapeString(raw)
				break
			}
		}
	}
	if strings.TrimSpace(raw) == "" {
		return ""
	}
	// 折叠空白并截断
	fields := strings.FieldsFunc(strings.TrimSpace(raw), func(r rune) bool {
		return unicode.IsSpace(r)
	})
	joined := strings.Join(fields, " ")
	runes := []rune(joined)
	if len(runes) > 300 {
		joined = string(runes[:300]) + "…"
	}
	return joined
}

// SaveAttachment 保存单个附件到 account/YYYY/MM 目录，返回相对 data 根的存储路径。
func (w *Writer) SaveAttachment(accountID int64, uid uint32, index int, filename string, content []byte) (string, error) {
	dir := filepath.Join(w.baseDir, fmt.Sprintf("%d", accountID), "attachments")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	ext := filepath.Ext(string(filename))
	name := fmt.Sprintf("%d_%d_%d%s", uid, index, time.Now().UnixNano(), sanitizeExt(ext))
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, content, 0644); err != nil {
		return "", err
	}
	return path, nil
}

func sanitizeExt(ext string) string {
	if ext == "" {
		return ""
	}
	var sb strings.Builder
	for _, r := range ext {
		if r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' {
			sb.WriteRune(r)
		}
	}
	if sb.Len() > 0 {
		return "." + sb.String()
	}
	return ""
}
