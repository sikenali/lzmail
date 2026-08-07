package api

import (
	"container/list"
	"sync"
	"time"
)

type bodyCacheEntry struct {
	key     int64
	html    string
	expires time.Time
}

type bodyCache struct {
	mu       sync.Mutex
	entries  map[int64]*list.Element
	order    *list.List
	ttl      time.Duration
	maxSize  int
}

var globalBodyCache = &bodyCache{
	entries: make(map[int64]*list.Element),
	order:   list.New(),
	ttl:     5 * time.Minute,
	maxSize: 500,
}

func init() {
	go globalBodyCache.cleanupLoop()
}

func (c *bodyCache) cleanupLoop() {
	ticker := time.NewTicker(2 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		c.cleanupExpired()
	}
}

func (c *bodyCache) cleanupExpired() {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	for elem := c.order.Front(); elem != nil; {
		next := elem.Next()
		entry := elem.Value.(*bodyCacheEntry)
		if now.After(entry.expires) {
			delete(c.entries, entry.key)
			c.order.Remove(elem)
		}
		elem = next
	}
}

func (c *bodyCache) get(emailID int64) (string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	elem, ok := c.entries[emailID]
	if !ok {
		return "", false
	}
	entry := elem.Value.(*bodyCacheEntry)
	if time.Now().After(entry.expires) {
		c.order.Remove(elem)
		delete(c.entries, emailID)
		return "", false
	}
	c.order.MoveToBack(elem)
	return entry.html, true
}

func (c *bodyCache) set(emailID int64, html string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if elem, ok := c.entries[emailID]; ok {
		c.order.MoveToBack(elem)
		elem.Value.(*bodyCacheEntry).html = html
		elem.Value.(*bodyCacheEntry).expires = time.Now().Add(c.ttl)
		return
	}

	for c.order.Len() >= c.maxSize {
		front := c.order.Front()
		if front != nil {
			delete(c.entries, front.Value.(*bodyCacheEntry).key)
			c.order.Remove(front)
		}
	}

	entry := &bodyCacheEntry{
		key:     emailID,
		html:    html,
		expires: time.Now().Add(c.ttl),
	}
	elem := c.order.PushBack(entry)
	c.entries[emailID] = elem
}
