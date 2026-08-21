package archive

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"html"
	"io"
	"log"
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

	"golang.org/x/text/encoding/japanese"
	"golang.org/x/text/encoding/simplifiedchinese"
)

// Attachment 是邮件中提取出的附件
type Attachment struct {
	Filename string
	MimeType string
	Size     int64
	Content  []byte
}

// InlineImage 是邮件中内嵌的图片资源
type InlineImage struct {
	ContentID string
	MimeType  string
	Content   []byte
}
// Parsed 是从 RFC822 原始邮件解析出的正文与附件信息
type Parsed struct {
	Preview        string
	Date           time.Time
	HasAttachments bool
	Attachments    []Attachment
	InlineImages   map[string]InlineImage // ContentID -> InlineImage
}

var htmlTagRe = regexp.MustCompile(`(?i)<(script|style)[^>]*>.*?</(script|style)>|<[^>]+>`)

// Parse 解析 RFC822 原始邮件，提取正文预览与附件。
func Parse(raw []byte) (*Parsed, error) {
	msg, err := mail.ReadMessage(bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}

	p := &Parsed{Date: time.Now().UTC(), InlineImages: make(map[string]InlineImage)}
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
					wd := mime.WordDecoder{}
					filename, _ := wd.DecodeHeader(dispParams["filename"])
					if filename == "" {
						filename = params["name"]
					}
					if filename == "" {
						filename = "attachment"
					}
					content := decodePart(part.Header.Get("Content-Transfer-Encoding"), "", partBytes)
					p.Attachments = append(p.Attachments, Attachment{
						Filename: filename,
						MimeType: mediaType,
						Size:     int64(len(content)),
						Content:  content,
					})
					p.HasAttachments = true
					continue
				}

				// 收集内嵌图片（有 Content-ID 且非 attachment）
				if contentID := part.Header.Get("Content-ID"); contentID != "" && isBinaryPart(mediaType) {
					contentID = strings.Trim(contentID, "<>")
					if contentID != "" {
						imageContent := decodePart(part.Header.Get("Content-Transfer-Encoding"), "", partBytes)
						p.InlineImages[contentID] = InlineImage{
							ContentID: contentID,
							MimeType:  mediaType,
							Content:   imageContent,
						}
					}
					continue
				}

				text := decodePart(part.Header.Get("Content-Transfer-Encoding"), params["charset"], partBytes)
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
		partMedia, partParams, _ := mime.ParseMediaType(contentType)
		text := decodePart(textproto.MIMEHeader(header).Get("Content-Transfer-Encoding"), partParams["charset"], data)
		switch {
		case strings.HasPrefix(partMedia, "text/plain"):
			plainParts = append(plainParts, string(text))
		case strings.HasPrefix(partMedia, "text/html"):
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

func decodePart(encoding, charset string, data []byte) []byte {
	var raw []byte
	switch strings.ToLower(strings.TrimSpace(encoding)) {
	case "base64":
		dst := make([]byte, base64.StdEncoding.DecodedLen(len(data)))
		n, err := base64.StdEncoding.Decode(dst, data)
		if err != nil {
			raw = data
		} else {
			raw = dst[:n]
		}
	case "quoted-printable":
		r := quotedprintable.NewReader(bytes.NewReader(data))
		decoded, err := io.ReadAll(r)
		if err != nil {
			raw = data
		} else {
			raw = decoded
		}
	default:
		raw = data
	}

	out, err := charsetToUTF8(charset, raw)
	if err != nil {
		return raw
	}
	return out
}

func charsetToUTF8(charset string, data []byte) ([]byte, error) {
	cs := strings.ToLower(strings.TrimSpace(charset))
	switch {
	case cs == "gbk" || cs == "gb2312" || cs == "gb18030" || cs == "gb_2312-80":
		return simplifiedchinese.GBK.NewDecoder().Bytes(data)
	case cs == "iso-2022-jp":
		return japanese.ISO2022JP.NewDecoder().Bytes(data)
	case cs == "shift_jis" || cs == "sjis":
		return japanese.ShiftJIS.NewDecoder().Bytes(data)
	case cs == "euc-jp":
		return japanese.EUCJP.NewDecoder().Bytes(data)
	case cs == "big5":
		// 未内置 big5 解码器，保持原字节
		return nil, fmt.Errorf("unsupported charset %q", charset)
	default:
		return data, nil
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

func extractBody(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("[archive] read %s failed: %v", path, err)
		return ""
	}

	// Try parse as EML
	msg, err := mail.ReadMessage(bytes.NewReader(data))
	if err != nil {
		log.Printf("[archive] parse %s failed: %v", path, err)
		return ""
	}

	// Get body
	body := msg.Body
	mediaType, _, _ := mime.ParseMediaType(msg.Header.Get("Content-Type"))

	var buf bytes.Buffer
	if strings.HasPrefix(mediaType, "multipart/") {
		// Handle multipart - prefer text/html
		mr := multipart.NewReader(body, msg.Header.Get("Content-Type"))
		for {
			part, err := mr.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				log.Printf("[archive] multipart part error: %v", err)
				continue
			}
			partType, _, _ := mime.ParseMediaType(part.Header.Get("Content-Type"))
			if partType == "text/html" {
				io.Copy(&buf, part)
				break
			}
			if partType == "text/plain" && buf.Len() == 0 {
				io.Copy(&buf, part)
			}
		}
	} else {
		io.Copy(&buf, body)
	}

	result := buf.String()
	if result == "" {
		log.Printf("[archive] empty body extracted from %s", path)
	}
	return result
}
