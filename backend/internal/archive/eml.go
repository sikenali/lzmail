package archive

import (
	"fmt"
	"os"
	"path/filepath"
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
