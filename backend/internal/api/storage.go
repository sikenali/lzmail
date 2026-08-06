package api

import (
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type DirEntry struct {
	Name    string `json:"name"`
	IsDir   bool   `json:"is_dir"`
	Path    string `json:"path"`
	Subdirs []DirEntry `json:"subdirs,omitempty"`
}

func (h *Handler) handleListStorageDirs(w http.ResponseWriter, r *http.Request) {
	basePath := r.URL.Query().Get("path")
	if basePath == "" {
		basePath = h.archiveDir
	}

	basePath = filepath.Clean(basePath)
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