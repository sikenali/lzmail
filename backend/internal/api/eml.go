package api

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net/mail"
	"os"
	"regexp"
	"strings"

	"golang.org/x/text/encoding/japanese"
	"golang.org/x/text/encoding/simplifiedchinese"
)

// extractBody 从 .eml 文件提取正文 HTML，并解析 cid: 内嵌图片引用。
// 返回 HTML 字符串，为空时调用方使用 body_preview 兜底。
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

	var inlineImages map[string][]byte
	var htmlParts []string
	var plainParts []string

	if strings.HasPrefix(mediaType, "multipart/") {
		inlineImages, htmlParts, plainParts = walkMultipart(msg.Body, params["boundary"])
	} else if strings.HasPrefix(mediaType, "text/html") {
		data, _ := io.ReadAll(msg.Body)
		htmlParts = append(htmlParts, decodePart(msg.Header.Get("Content-Transfer-Encoding"), params["charset"], data))
	} else if strings.HasPrefix(mediaType, "text/plain") {
		data, _ := io.ReadAll(msg.Body)
		plainParts = append(plainParts, decodePart(msg.Header.Get("Content-Transfer-Encoding"), params["charset"], data))
	}

	html := buildHTML(inlineImages, htmlParts, plainParts)
	return html
}

// walkMultipart 递归遍历 multipart 邮件，收集内嵌图片并提取 HTML 正文。
func walkMultipart(r io.Reader, boundary string) (map[string][]byte, []string, []string) {
	inlineImages := make(map[string][]byte)
	var htmlParts, plainParts []string

	mr := multipart.NewReader(r, boundary)
	for {
		part, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			break
		}

		ct := part.Header.Get("Content-Type")
		mediaType, params, _ := mime.ParseMediaType(ct)
		partBytes, _ := io.ReadAll(part)

		if strings.HasPrefix(mediaType, "multipart/") {
			subInline, subHTML, subPlain := walkMultipart(strings.NewReader(string(partBytes)), params["boundary"])
			for k, v := range subInline {
				inlineImages[k] = v
			}
			htmlParts = append(htmlParts, subHTML...)
			plainParts = append(plainParts, subPlain...)
			continue
		}

		// 收集内嵌图片：有 Content-ID 且为二进制类型
		if contentID := part.Header.Get("Content-ID"); contentID != "" && isBinaryMedia(mediaType) {
			cleanID := strings.Trim(contentID, "<>")
			if cleanID != "" {
				imageData := []byte(decodePart(part.Header.Get("Content-Transfer-Encoding"), "", partBytes))
				inlineImages[cleanID] = imageData
			}
			continue
		}

		text := decodePart(part.Header.Get("Content-Transfer-Encoding"), params["charset"], partBytes)
		switch {
		case mediaType == "text/html":
			htmlParts = append(htmlParts, text)
		case mediaType == "text/plain":
			plainParts = append(plainParts, text)
		}
	}

	return inlineImages, htmlParts, plainParts
}

func isBinaryMedia(mediaType string) bool {
	if mediaType == "" {
		return false
	}
	lower := strings.ToLower(mediaType)
	if strings.HasPrefix(lower, "text/") || strings.HasPrefix(lower, "multipart/") || strings.HasPrefix(lower, "message/") {
		return false
	}
	return true
}

func buildHTML(inlineImages map[string][]byte, htmlParts, plainParts []string) string {
	for _, html := range htmlParts {
		if strings.TrimSpace(html) != "" {
			return resolveCIDReferences(html, inlineImages)
		}
	}
	for _, plain := range plainParts {
		if strings.TrimSpace(plain) != "" {
			return "<pre>" + escapeHTML(plain) + "</pre>"
		}
	}
	return ""
}

// resolveCIDReferences 将 HTML 中的 cid: 引用替换为 data: URL。
var cidRe = regexp.MustCompile(`(?i)(src|href)\s*=\s*["']\s*cid:([^"'>\s]+)`)

func resolveCIDReferences(html string, inlineImages map[string][]byte) string {
	return cidRe.ReplaceAllStringFunc(html, func(match string) string {
		submatches := cidRe.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		attr := submatches[1]
		contentID := submatches[2]

		if data, ok := inlineImages[contentID]; ok {
			mimeType := detectMimeType(contentID, data)
			encoded := base64.StdEncoding.EncodeToString(data)
			return fmt.Sprintf(`%s="data:%s;base64,%s"`, attr, mimeType, encoded)
		}
		// 找不到对应图片，移除该属性避免 broken image
		return match
	})
}

func detectMimeType(contentID string, data []byte) string {
	lower := strings.ToLower(contentID)
	switch {
	case strings.HasSuffix(lower, ".png"):
		return "image/png"
	case strings.HasSuffix(lower, ".jpg") || strings.HasSuffix(lower, ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(lower, ".gif"):
		return "image/gif"
	case strings.HasSuffix(lower, ".webp"):
		return "image/webp"
	case strings.HasSuffix(lower, ".svg"):
		return "image/svg+xml"
	}
	if len(data) >= 8 {
		switch {
		case data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47:
			return "image/png"
		case data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF:
			return "image/jpeg"
		case data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46:
			return "image/gif"
		}
	}
	return "image/png"
}

func escapeHTML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	return s
}

func decodePart(encoding, charset string, data []byte) string {
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
		return string(raw)
	}
	return string(out)
}

func charsetToUTF8(charset string, data []byte) ([]byte, error) {
	cs := strings.ToLower(strings.TrimSpace(charset))
	switch {
	case cs == "gbk" || cs == "gb2312" || cs == "gb18030" || cs == "gb_2312-80":
		return simplifiedchinese.GBK.NewDecoder().Bytes(data)
	case cs == "iso-2022-jp":
		return data, nil
	case cs == "shift_jis" || cs == "sjis":
		return japanese.ShiftJIS.NewDecoder().Bytes(data)
	case cs == "euc-jp":
		return japanese.EUCJP.NewDecoder().Bytes(data)
	case cs == "big5":
		return nil, fmt.Errorf("unsupported charset %q", charset)
	default:
		return data, nil
	}
}
