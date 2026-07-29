package api

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// anchorPath 将请求路径锚定到 allowed root 内，防止任意目录遍历读取。
func anchorPath(root, p string) (string, error) {
	rootAbs, err := filepath.Abs(root)
	if err != nil {
		return "", err
	}
	abs, err := filepath.Abs(p)
	if err != nil {
		return "", err
	}
	if abs != rootAbs && !strings.HasPrefix(abs, rootAbs+string(os.PathSeparator)) {
		return "", fmt.Errorf("path outside allowed root")
	}
	return abs, nil
}

type DirEntry struct {
	Name    string     `json:"name"`
	IsDir   bool       `json:"is_dir"`
	Path    string     `json:"path"`
	Subdirs []DirEntry `json:"subdirs,omitempty"`
}

type TreeEntry struct {
	Name     string      `json:"name"`
	IsDir    bool        `json:"is_dir"`
	Path     string      `json:"path"`
	Children []TreeEntry `json:"children,omitempty"`
}

const (
	treeMaxDepth = 6
	treeMaxNodes = 400
)

func (h *Handler) handleListStorageDirs(w http.ResponseWriter, r *http.Request) {
	basePath := r.URL.Query().Get("path")
	if basePath == "" {
		basePath = h.archiveDir
	}
	resolved, err := anchorPath(h.archiveDir, basePath)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	basePath = resolved

	info, err := os.Stat(basePath)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path not accessible: " + err.Error()})
		return
	}
	if !info.IsDir() {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path is not a directory"})
		return
	}

	entries, err := os.ReadDir(basePath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	sort.Slice(entries, func(i, j int) bool {
		if entries[i].IsDir() != entries[j].IsDir() {
			return entries[i].IsDir()
		}
		return strings.ToLower(entries[i].Name()) < strings.ToLower(entries[j].Name())
	})

	var result []DirEntry
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), ".") {
			continue
		}
		entry := DirEntry{
			Name:  e.Name(),
			IsDir: e.IsDir(),
			Path:  filepath.Join(basePath, e.Name()),
		}
		if e.IsDir() {
			subs, _ := os.ReadDir(entry.Path)
			for _, s := range subs {
				if s.IsDir() && !strings.HasPrefix(s.Name(), ".") {
					entry.Subdirs = append(entry.Subdirs, DirEntry{
						Name:  s.Name(),
						IsDir: true,
						Path:  filepath.Join(entry.Path, s.Name()),
					})
				}
			}
			sort.Slice(entry.Subdirs, func(i, j int) bool {
				return strings.ToLower(entry.Subdirs[i].Name) < strings.ToLower(entry.Subdirs[j].Name)
			})
		}
		result = append(result, entry)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"path":    basePath,
		"entries": result,
	})
}

// buildTree recursively walks basePath (up to treeMaxDepth levels and a total of
// treeMaxNodes entries) so the settings page can render the real archive
// directory structure as a tree.
func buildTree(basePath string, depth int, budget *int) []TreeEntry {
	if depth > treeMaxDepth || *budget <= 0 {
		return nil
	}
	entries, err := os.ReadDir(basePath)
	if err != nil {
		return nil
	}
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].IsDir() != entries[j].IsDir() {
			return entries[i].IsDir()
		}
		return strings.ToLower(entries[i].Name()) < strings.ToLower(entries[j].Name())
	})

	var result []TreeEntry
	for _, e := range entries {
		if *budget <= 0 {
			break
		}
		if strings.HasPrefix(e.Name(), ".") {
			continue
		}
		*budget--
		entry := TreeEntry{
			Name:  e.Name(),
			IsDir: e.IsDir(),
			Path:  filepath.Join(basePath, e.Name()),
		}
		if e.IsDir() {
			entry.Children = buildTree(entry.Path, depth+1, budget)
		}
		result = append(result, entry)
	}
	return result
}

func (h *Handler) handleStorageTree(w http.ResponseWriter, r *http.Request) {
	basePath := r.URL.Query().Get("path")
	if basePath == "" {
		basePath = h.archiveDir
	}
	resolved, err := anchorPath(h.archiveDir, basePath)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	basePath = resolved

	info, err := os.Stat(basePath)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path not accessible: " + err.Error()})
		return
	}
	if !info.IsDir() {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path is not a directory"})
		return
	}

	budget := treeMaxNodes
	rootName := filepath.Base(basePath)
	root := TreeEntry{
		Name:  rootName,
		IsDir: true,
		Path:  basePath,
	}
	root.Children = buildTree(basePath, 1, &budget)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"path": basePath,
		"root": root,
	})
}
