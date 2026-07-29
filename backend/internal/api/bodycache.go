package api

import (
	"sync"
	"time"
)

type bodyCacheEntry struct {
	html    string
	expires time.Time
}

type bodyCache struct {
	mu       sync.RWMutex
	entries  map[int64]bodyCacheEntry
	ttl      time.Duration
	maxSize  int
}

var globalBodyCache = &bodyCache{
	entries: make(map[int64]bodyCacheEntry),
	ttl:     5 * time.Minute,
	maxSize: 500,
}

func (c *bodyCache) get(emailID int64) (string, bool) {
	c.mu.RLock()
	e, ok := c.entries[emailID]
	c.mu.RUnlock()
	if !ok || time.Now().After(e.expires) {
		if ok {
			c.mu.Lock()
			delete(c.entries, emailID)
			c.mu.Unlock()
		}
		return "", false
	}
	return e.html, true
}

func (c *bodyCache) set(emailID int64, html string) {
	c.mu.Lock()
	if len(c.entries) >= c.maxSize {
		for k := range c.entries {
			delete(c.entries, k)
			break
		}
	}
	c.entries[emailID] = bodyCacheEntry{html: html, expires: time.Now().Add(c.ttl)}
	c.mu.Unlock()
}
