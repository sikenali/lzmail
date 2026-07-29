package archive

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type Writer struct {
	baseDir string
}

func NewWriter(baseDir string) *Writer {
	return &Writer{baseDir: baseDir}
}

func (w *Writer) Save(accountID int64, uid uint32, date time.Time, raw []byte) (string, error) {
	dir := filepath.Join(w.baseDir, fmt.Sprintf("%d", accountID), date.Format("2006"), date.Format("01"))
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	filename := filepath.Join(dir, fmt.Sprintf("%d.eml", uid))
	if err := os.WriteFile(filename, raw, 0644); err != nil {
		return "", err
	}
	return filename, nil
}

// SaveInlineImage 保存内嵌图片到 account/inline_images 目录，返回相对 data 根的路径。
func (w *Writer) SaveInlineImage(accountID int64, uid uint32, contentID string, mimeType string, content []byte) (string, error) {
	dir := filepath.Join(w.baseDir, fmt.Sprintf("%d", accountID), "inline_images")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	safeID := regexp.MustCompile(`[^a-zA-Z0-9]`).ReplaceAllString(contentID, "_")
	ext := mimeTypeExt(mimeType)
	name := fmt.Sprintf("%d_%s%s", uid, safeID, ext)
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, content, 0644); err != nil {
		return "", err
	}
	return path, nil
}

func mimeTypeExt(mimeType string) string {
	switch {
	case strings.HasPrefix(mimeType, "image/jpeg"):
		return ".jpg"
	case strings.HasPrefix(mimeType, "image/gif"):
		return ".gif"
	case strings.HasPrefix(mimeType, "image/webp"):
		return ".webp"
	case strings.HasPrefix(mimeType, "image/svg"):
		return ".svg"
	default:
		return ".png"
	}
}
